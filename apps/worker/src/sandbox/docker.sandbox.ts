// ============================================================
// DOCKER SANDBOX EXECUTOR - Secure isolated code execution
// ============================================================

import Docker from 'dockerode';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { Language, LANGUAGE_CONFIG } from '@code-platform/shared';
import { workerLogger as logger } from '../utils/logger';

const docker = new Docker();

const MAX_OUTPUT_SIZE = parseInt(process.env.MAX_OUTPUT_SIZE || '1048576'); // 1MB

export interface ExecutionOptions {
  code: string;
  language: Language;
  stdin?: string;
  timeLimit: number; // seconds
  memoryLimit: number; // MB
  onOutput: (chunk: string, stream: 'stdout' | 'stderr') => void;
}

export interface ExecutionOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  memoryUsed: number;
  status: 'completed' | 'failed' | 'timeout' | 'memory_limit';
}

export class DockerSandbox {
  private workDir: string = '';

  async execute(options: ExecutionOptions): Promise<ExecutionOutput> {
    const { code, language, stdin, timeLimit, memoryLimit, onOutput } = options;
    const langConfig = LANGUAGE_CONFIG[language];
    const execId = uuidv4();
    const startTime = Date.now();

    // Create temporary directory for code files
    this.workDir = path.join(os.tmpdir(), `exec-${execId}`);
    await fs.mkdir(this.workDir, { recursive: true });

    let stdout = '';
    let stderr = '';
    let exitCode = 0;
    let status: ExecutionOutput['status'] = 'completed';

    try {
      // Write code to file
      const filename = language === 'java' ? 'Solution.java' : `solution.${langConfig.extension}`;
      const codePath = path.join(this.workDir, filename);
      await fs.writeFile(codePath, code, 'utf-8');

      // Write stdin if provided
      if (stdin) {
        await fs.writeFile(path.join(this.workDir, 'stdin.txt'), stdin, 'utf-8');
      }

      // Docker container configuration
      const containerConfig: Docker.ContainerCreateOptions = {
        Image: langConfig.dockerImage,
        Cmd: this.buildCommand(language, langConfig, !!stdin),
        AttachStdout: true,
        AttachStderr: true,
        AttachStdin: !!stdin,
        OpenStdin: !!stdin,
        StdinOnce: !!stdin,
        Tty: false,
        NetworkDisabled: true, // No network access
        HostConfig: {
          Memory: memoryLimit * 1024 * 1024, // Convert MB to bytes
          MemorySwap: memoryLimit * 1024 * 1024, // Disable swap
          CpuPeriod: 100000,
          CpuQuota: 50000, // 50% of one CPU
          PidsLimit: 50, // Limit processes
          ReadonlyRootfs: false,
          Binds: [`${this.workDir.replace(/\\/g, '/')}:/code:ro`],
          SecurityOpt: [
            'no-new-privileges:true',
            'seccomp=unconfined', // In production, use custom seccomp profile
          ],
          AutoRemove: false, // We'll remove manually
          Ulimits: [
            { Name: 'nofile', Soft: 64, Hard: 64 }, // File descriptor limit
            { Name: 'nproc', Soft: 50, Hard: 50 }, // Process limit
          ],
          CapDrop: ['ALL'], // Drop all capabilities
          CapAdd: [], // Add none back
        },
        WorkingDir: '/code',
      };

      // Create container
      const container = await docker.createContainer(containerConfig);

      // Collect output streams
      const outputCollector = await container.attach({
        stream: true,
        stdout: true,
        stderr: true,
        stdin: !!stdin,
      });

      // Handle stdin
      if (stdin && outputCollector instanceof Readable) {
        // stdin handling - pipe stdin data to container
      }

      // Set up output collection promise
      const outputPromise = new Promise<void>((resolve, reject) => {
        let totalSize = 0;

        container.modem.demuxStream(
          outputCollector as any,
          {
            write(chunk: Buffer) {
              totalSize += chunk.length;
              if (totalSize <= MAX_OUTPUT_SIZE) {
                const text = chunk.toString('utf-8');
                stdout += text;
                onOutput(text, 'stdout');
              }
            },
          } as any,
          {
            write(chunk: Buffer) {
              totalSize += chunk.length;
              if (totalSize <= MAX_OUTPUT_SIZE) {
                const text = chunk.toString('utf-8');
                stderr += text;
                onOutput(text, 'stderr');
              }
            },
          } as any
        );

        outputCollector.on('end', resolve);
        outputCollector.on('error', reject);
      });

      // Start container
      await container.start();

      // Wait for completion with timeout
      const waitResult = await Promise.race([
        container.wait(),
        new Promise<{ StatusCode: number }>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), timeLimit * 1000)
        ),
      ]).catch(async (err) => {
        if (err.message === 'TIMEOUT') {
          status = 'timeout';
          try {
            await container.kill({ signal: 'SIGKILL' });
          } catch {
            // Container may have already exited
          }
          return { StatusCode: 124 };
        }
        throw err;
      });

      try {
        await Promise.race([
          outputPromise,
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      } catch {
        // Ignore output drain errors
      }

      exitCode = waitResult.StatusCode;

      if (exitCode !== 0 && status === 'completed') {
        status = exitCode === 137 ? 'memory_limit' : 'failed';
      }

      // Get container stats for memory usage
      let memoryUsed = 0;
      try {
        const stats = await container.stats({ stream: false });
        memoryUsed = stats.memory_stats?.usage || 0;
        memoryUsed = Math.round(memoryUsed / 1024 / 1024); // Convert to MB
      } catch {
        // Stats not available
      }

      // Remove container
      try {
        await container.remove({ force: true });
      } catch {
        // Container may have already been removed
      }

      const executionTime = Date.now() - startTime;

      return {
        stdout: stdout.slice(0, MAX_OUTPUT_SIZE),
        stderr: stderr.slice(0, MAX_OUTPUT_SIZE),
        exitCode,
        executionTime,
        memoryUsed,
        status,
      };
    } catch (error: any) {
      logger.error('Docker execution error', { error: error.message, language });

      if (error.message?.includes('No such image')) {
        throw new Error(`Docker image not found: ${langConfig.dockerImage}. Please pull it first.`);
      }

      throw error;
    } finally {
      // Always clean up temp directory
      try {
        await fs.rm(this.workDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private buildCommand(
    language: Language,
    langConfig: (typeof LANGUAGE_CONFIG)[Language],
    hasStdin: boolean
  ): string[] {
    const commands: string[] = [];

    if (langConfig.compileCmd) {
      // Compile first, then run
      const compileArgs = langConfig.compileCmd.split(' ');
      const runArgs = langConfig.runCmd.split(' ');

      if (hasStdin) {
        return ['sh', '-c', `${langConfig.compileCmd} && ${langConfig.runCmd} < /code/stdin.txt`];
      }
      return ['sh', '-c', `${langConfig.compileCmd} && ${langConfig.runCmd}`];
    }

    if (hasStdin) {
      return ['sh', '-c', `${langConfig.runCmd} < /code/stdin.txt`];
    }

    return langConfig.runCmd.split(' ');
  }
}

export async function pullExecutorImages(): Promise<void> {
  const languages = Object.keys(LANGUAGE_CONFIG) as Language[];

  logger.info('Checking executor Docker images...');

  for (const lang of languages) {
    const imageName = LANGUAGE_CONFIG[lang].dockerImage;
    try {
      await docker.getImage(imageName).inspect();
      logger.info(`✅ Image exists: ${imageName}`);
    } catch {
      logger.warn(`⚠️  Image not found locally: ${imageName}. Build it with docker/build-executors.sh`);
    }
  }
}

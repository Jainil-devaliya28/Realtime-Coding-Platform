import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@codeplatform.dev' },
    update: {},
    create: {
      email: 'admin@codeplatform.dev',
      username: 'admin',
      password: adminPassword,
      role: 'admin',
    },
  });

  // Create demo users
  const demoPassword = await bcrypt.hash('demo123456', 12);
  const user1 = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      username: 'alice_dev',
      password: demoPassword,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      username: 'bob_coder',
      password: demoPassword,
    },
  });

  // Create demo rooms
  const pythonRoom = await prisma.room.upsert({
    where: { id: 'demo-python-room' },
    update: {},
    create: {
      id: 'demo-python-room',
      name: 'Python Playground',
      description: 'A collaborative Python coding room',
      language: 'python',
      code: `# Welcome to Python Playground!
# Collaborative coding with AI assistance

def fibonacci(n):
    """Generate fibonacci sequence up to n terms"""
    a, b = 0, 1
    result = []
    for _ in range(n):
        result.append(a)
        a, b = b, a + b
    return result

def main():
    n = 10
    fib = fibonacci(n)
    print(f"First {n} Fibonacci numbers: {fib}")
    print(f"Sum: {sum(fib)}")

if __name__ == "__main__":
    main()
`,
      isPublic: true,
      ownerId: admin.id,
    },
  });

  const jsRoom = await prisma.room.upsert({
    where: { id: 'demo-js-room' },
    update: {},
    create: {
      id: 'demo-js-room',
      name: 'JavaScript Lab',
      description: 'Modern JavaScript & algorithms',
      language: 'javascript',
      code: `// JavaScript Lab - Collaborative Coding
// Real-time collaboration with AI debugging

class BinarySearchTree {
  constructor() {
    this.root = null;
  }

  insert(value) {
    const node = { value, left: null, right: null };
    if (!this.root) {
      this.root = node;
      return this;
    }
    
    let current = this.root;
    while (true) {
      if (value < current.value) {
        if (!current.left) { current.left = node; return this; }
        current = current.left;
      } else {
        if (!current.right) { current.right = node; return this; }
        current = current.right;
      }
    }
  }

  inOrder(node = this.root, result = []) {
    if (node) {
      this.inOrder(node.left, result);
      result.push(node.value);
      this.inOrder(node.right, result);
    }
    return result;
  }
}

const bst = new BinarySearchTree();
[5, 3, 7, 1, 4, 6, 8].forEach(v => bst.insert(v));
console.log("In-order traversal:", bst.inOrder());
`,
      isPublic: true,
      ownerId: user1.id,
    },
  });

  const cppRoom = await prisma.room.upsert({
    where: { id: 'demo-cpp-room' },
    update: {},
    create: {
      id: 'demo-cpp-room',
      name: 'C++ Arena',
      description: 'High performance C++ algorithms',
      language: 'cpp',
      code: `#include <iostream>
#include <vector>
#include <algorithm>
#include <chrono>

// Quick sort implementation
void quickSort(std::vector<int>& arr, int low, int high) {
    if (low < high) {
        int pivot = arr[high];
        int i = low - 1;
        
        for (int j = low; j < high; j++) {
            if (arr[j] <= pivot) {
                i++;
                std::swap(arr[i], arr[j]);
            }
        }
        std::swap(arr[i + 1], arr[high]);
        
        int pi = i + 1;
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

int main() {
    std::vector<int> arr = {64, 25, 12, 22, 11, 90, 45, 33};
    
    auto start = std::chrono::high_resolution_clock::now();
    quickSort(arr, 0, arr.size() - 1);
    auto end = std::chrono::high_resolution_clock::now();
    
    std::cout << "Sorted array: ";
    for (int x : arr) std::cout << x << " ";
    
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    std::cout << "\\nExecution time: " << duration.count() << " microseconds\\n";
    
    return 0;
}
`,
      isPublic: true,
      ownerId: user2.id,
    },
  });

  // Create memberships
  await prisma.roomMembership.createMany({
    skipDuplicates: true,
    data: [
      { userId: user1.id, roomId: pythonRoom.id },
      { userId: user2.id, roomId: pythonRoom.id },
      { userId: user2.id, roomId: jsRoom.id },
      { userId: user1.id, roomId: cppRoom.id },
    ],
  });

  console.log('✅ Seed complete!');
  console.log(`👤 Admin: admin@codeplatform.dev / admin123456`);
  console.log(`👤 User 1: alice@example.com / demo123456`);
  console.log(`👤 User 2: bob@example.com / demo123456`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

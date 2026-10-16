FROM eclipse-temurin:21-jdk-alpine
LABEL description="Java 21 JDK code executor sandbox"

RUN adduser -D -u 9999 -s /bin/sh sandbox 2>/dev/null || adduser --disabled-password --gecos "" --uid 9999 sandbox
RUN mkdir -p /code && chown sandbox:sandbox /code

WORKDIR /code
USER sandbox

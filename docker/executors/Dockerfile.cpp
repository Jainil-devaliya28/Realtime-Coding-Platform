FROM alpine:3.19
LABEL description="GCC C++ code executor sandbox"

RUN apk add --no-cache g++ make
RUN adduser -D -u 9999 -s /bin/sh sandbox
RUN mkdir -p /code && chown sandbox:sandbox /code

WORKDIR /code
USER sandbox

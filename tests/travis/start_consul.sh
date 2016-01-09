#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

pwd

NAME=consul
VERSION=0.6.1
ARCHIVE_NAME=${NAME}_${VERSION}_linux_amd64.zip

if [ ! -f "$DIR/$NAME" ]; then
  curl -O -insecure https://releases.hashicorp.com/${NAME}/${VERSION}/${ARCHIVE_NAME}
  unzip ${ARCHIVE_NAME}
fi

./consul version

nohup ./consul agent -dev &

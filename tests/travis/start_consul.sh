#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

pwd

NAME=consul
VERSION=0.6.4
ARCHIVE_NAME=${NAME}_${VERSION}_linux_amd64.zip

if [ ! -f ${NAME} ]; then
  if [ ! -f ${ARCHIVE_NAME} ]; then
    rm ${ARCHIVE_NAME}
    curl -O -insecure https://releases.hashicorp.com/${NAME}/${VERSION}/${ARCHIVE_NAME}
  fi

  rm ${NAME}
  unzip -o ${ARCHIVE_NAME}
fi

./consul version

nohup ./consul agent -dev &

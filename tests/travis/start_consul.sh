#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

NAME=consul
VERSION=0.7.3

case $(uname) in
  Darwin )
    ARCH=darwin_amd64
    ;;
  Linux )
    ARCH=linux_amd64
    ;;
esac

ARCHIVE_NAME=${NAME}_${VERSION}_${ARCH}.zip
URL=https://releases.hashicorp.com/${NAME}/${VERSION}/${ARCHIVE_NAME}
echo ${URL}

if [ ! -f ${NAME} ]; then
  if [ ! -f ${ARCHIVE_NAME} ]; then
    #rm ${ARCHIVE_NAME}
    curl -O -insecure ${URL}
  fi

  rm ${NAME}
  unzip -o ${ARCHIVE_NAME}
fi

./consul version

nohup ./consul agent -dev &

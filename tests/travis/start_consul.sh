#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

NAME=consul
VERSION=0.7.4

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
nslookup releases.hashicorp.com
ping -c 5 releases.hashicorp.com

rm -f ${NAME} ${ARCHIVE_NAME} nohup.out

curl -O ${URL}
echo 'curl rc: ' $?
unzip -o ${ARCHIVE_NAME}
ls -l

./consul version

nohup ./consul agent -dev &

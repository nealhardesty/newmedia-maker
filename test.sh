#!/bin/bash


ffmpeg -i "$1" -acodec libfaac -b:a 64k -vcodec mpeg4 -b:v 200k -flags +aic+mv4 "$2"

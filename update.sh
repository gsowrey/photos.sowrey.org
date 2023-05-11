#!/bin/bash

node build_library.js
node hugo.js generate
hugo server --ignoreCache

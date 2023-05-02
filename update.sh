#!/bin/bash

node build_yaml.js
node hugo.js generate
hugo server --ignoreCache

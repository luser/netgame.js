#!/bin/sh
# Update example code on gh-pages branch.

git checkout gh-pages
git checkout master -- netgame.js examples
git commit -am "update from master"
git checkout master

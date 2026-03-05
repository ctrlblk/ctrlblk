#!/bin/sh -ex

# Consume command line args
CTRLBLK_FILTERS_REF_OLD=$1
CTRLBLK_FILTERS_REF_NEW=$2

if [ ! -z $CTRLBLOCK_DEPLOY_TOKEN ]; then
    export GITHUB_TOKEN=$CTRLBLOCK_DEPLOY_TOKEN@;
    export GITHUB_BASE_URL="https://"$GITHUB_TOKEN"github.com/ctrlblk";
else
    export GITHUB_BASE_URL="git@github.com:ctrlblk";
fi

# Remember start so we can return at the end
START=$(pwd);

# Create a temporary working space
TMP=$(mktemp -d);
cd $TMP;

# Clone ctrlblk-filters
git clone $GITHUB_BASE_URL"/ctrlblk-filters.git"

cd ctrlblk-filters
git checkout -f $CTRLBLK_FILTERS_REF_NEW

# Build ctrlblk-filters list
pnpm install
pnpm run build

# Parse ad-report uuid from git log
git log $CTRLBLK_FILTERS_REF_OLD..$CTRLBLK_FILTERS_REF_NEW > ctrlblk-filters-log.txt
node $START/build/parse-ctrlblk-filters-log.mjs --input ctrlblk-filters-log.txt --output dist/ad-reports.json

# return back to temp dir
cd $TMP

# Go back to the start, copy the result and cleanup
cd $START;

# First remove targets from possible previous run
rm -rf ctrlblk-filters;

# Then copy the new results
cp -vrf $TMP/ctrlblk-filters/dist ctrlblk-filters;

# Finally cleanup
rm -vrf $TMP;

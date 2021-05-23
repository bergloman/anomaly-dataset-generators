#! /bin/bash

set -e

#########################################################################
# This script generates datacenter datasets in CSV format
#########################################################################

GENERATOR="parking"

TYPES=("type-ber")
SOURCES=("moderate")
NORMALIZE="no"

DIR=params/params_parking/source/tmp
DIR_OUT=$DIR/data
mkdir -p $DIR_OUT

for FILE in $DIR/*.json; do
    FILENAME=$(basename -- "$FILE")
    echo "Found $FILE"
    OUT_FILE=$DIR_OUT/$FILENAME.csv
    rm -rf $OUT_FILE*
    # echo "Preparing $GENERATOR $SOURCE $TYPE $NORMALIZE csv file"
    node build/main.js \
        --generator $GENERATOR \
        -t csv \
        --skip_timestamp \
        -f $FILE \
        -o $OUT_FILE \
        $NORMALIZE

    # do some stuff here with "$f"
    # remember to quote it or spaces may misbehave
done

# for NORMALIZE_TAG in "${NORMALIZE_TAGS[@]}"
# do
#     for TYPE in "${TYPES[@]}"
#     do
#         NORMALIZE=""
#         DIR_POSTFIX=""
#         if [ $NORMALIZE_TAG == "yes" ]; then NORMALIZE="--normalize_hours"; fi
#         if [ $NORMALIZE_TAG == "yes" ]; then DIR_POSTFIX="_normalized_hours"; fi

#         for SOURCE in "${SOURCES[@]}"
#         do
#             rm -rf $DIR/$SOURCE.$TYPE.csv*
#             echo "Preparing $GENERATOR $SOURCE $TYPE $NORMALIZE csv file"
#             node build/main.js \
#                 --generator $GENERATOR \
#                 -t csv \
#                 --skip_timestamp \
#                 -f params/params_$GENERATOR/$TYPE/params.$SOURCE.$TYPE.json \
#                 -o $DIR/$SOURCE.$TYPE.csv \
#                 $NORMALIZE &
#         done
#     done
# done

echo "Finished."

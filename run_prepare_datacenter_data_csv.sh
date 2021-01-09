#! /bin/bash

#########################################################################
# This script generates parking-lot datasets in CSV format
#########################################################################

TYPES=("type1" "type2" "type3" "type12" "type13" "type23" "type123")
SOURCES=("complex" "moderate" "simple" "single" "flat")
NORMALIZE_TAGS=("yes" "no")
GENERATOR="datacenter"
NORMALIZE=""

for NORMALIZE_TAG in "${NORMALIZE_TAGS[@]}"
do
    for TYPE in "${TYPES[@]}"
    do
        NORMALIZE=""
        DIR_POSTFIX=""
        if [ $NORMALIZE_TAG == "yes" ]; then NORMALIZE="--normalize_hours"; fi
        if [ $NORMALIZE_TAG == "yes" ]; then DIR_POSTFIX="_normalized_hours"; fi
        DIR=data_$GENERATOR/csv$DIR_POSTFIX/$TYPE
        mkdir -p $DIR
        for SOURCE in "${SOURCES[@]}"
        do
            rm -rf $DIR/$SOURCE.$TYPE.csv*
            echo "Preparing $GENERATOR $SOURCE $TYPE $NORMALIZE csv file"
            node build/main.js \
                --generator $GENERATOR \
                -t csv \
                -f params/$TYPE/params.$SOURCE.$TYPE.json \
                -o $DIR/$SOURCE.$TYPE.csv \
                $NORMALIZE
        done
    done
done

echo "Finished."

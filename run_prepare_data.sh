#! /bin/bash


echo "********************************"
echo "Thos file is obsolete, use CSV"
echo "********************************"
exit 10

mkdir -p out

TYPES=("type1" "type2" "type3" "type12" "type13" "type23" "type123")
SOURCES=("complex" "moderate" "simple" "single")

# TYPES=("type2" "type23")
# SOURCES=("complex" "moderate" "simple" "single")

# TYPES=("type123")
# SOURCES=("single")

for TYPE in "${TYPES[@]}"
do
    DIR=data/raw/$TYPE
    mkdir -p $DIR

    for SOURCE in "${SOURCES[@]}"
    do
        echo "Preparing $SOURCE $TYPE"
        node build/main.js -f params/$TYPE/params.$SOURCE.$TYPE.json > $DIR/$SOURCE.$TYPE.ldjson
        sort -o $DIR/$SOURCE.$TYPE.ldjson $DIR/$SOURCE.$TYPE.ldjson
    done
done

for TYPE in "${TYPES[@]}"
do
    DIR=data/raw/$TYPE
    for SOURCE in "${SOURCES[@]}"
    do
        wc -l $DIR/$SOURCE.$TYPE.ldjson
    done
done

#! /bin/bash

TYPES=("type1" "type2" "type3" "type12" "type13" "type23" "type123")
SOURCES=("complex" "moderate" "simple" "single")

# TYPES=("type123")
# SOURCES=("single")

for TYPE in "${TYPES[@]}"
do
    DIR=data/csv/$TYPE
    mkdir -p $DIR

    for SOURCE in "${SOURCES[@]}"
    do
        rm $DIR/$SOURCE.$TYPE.csv
        echo "Preparing $SOURCE $TYPE csv file"
        node build/main.js \
            --skip_timestamp \
            -t csv \
            -f params/$TYPE/params.$SOURCE.$TYPE.json \
            -o $DIR/$SOURCE.$TYPE.csv
    done
done

for TYPE in "${TYPES[@]}"
do
    DIR=data/csv_normalized_hours/$TYPE
    mkdir -p $DIR

    for SOURCE in "${SOURCES[@]}"
    do
        rm $DIR/$SOURCE.$TYPE.csv
        echo "Preparing $SOURCE $TYPE csv file"
        node build/main.js \
            --skip_timestamp \
            -t csv \
            -f params/$TYPE/params.$SOURCE.$TYPE.json \
            -o $DIR/$SOURCE.$TYPE.csv --normalize_hours
    done
done

echo "Printing final file sizes:"
for FILE in $(find data/csv -name '*.csv'); do
    ANOMS=$(grep anomaly $FILE | wc -l)
    LINES=$(wc -l $FILE)
    echo "$FILE lines=$LINES anomalies=$ANOMS"
done
for FILE in $(find data/csv_normalized_hours -name '*.csv'); do
    ANOMS=$(grep anomaly $FILE | wc -l)
    LINES=$(wc -l $FILE)
    echo "$FILE lines=$LINES anomalies=$ANOMS"
done
echo "Finished."

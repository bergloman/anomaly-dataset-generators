#!/bin/zsh

SESSIONNAME="fsada"

BASE="./"

cd $BASE
tmux has-session -t $SESSIONNAME &> /dev/null

if [ $? != 0 ]
then
    tmux new-session -s $SESSIONNAME -n dev -d
    tmux send-keys -t $SESSIONNAME "cd $BASE" C-m
    tmux split-window -h
    tmux new-session -s $SESSIONNAME -n dev -d
    tmux send-keys -t $SESSIONNAME "cd $BASE" C-m
    tmux send-keys -t $SESSIONNAME "tsc --watch" C-m
    tmux split-window -h
    tmux send-keys -t $SESSIONNAME "cd $BASE" C-m
    tmux send-keys -t $SESSIONNAME "cd ../../../qtopology-extras" C-m
    tmux send-keys -t $SESSIONNAME "npm install" C-m
    tmux send-keys -t $SESSIONNAME "tsc" C-m
    tmux split-window -h
    tmux send-keys -t $SESSIONNAME "cd $BASE" C-m
    tmux send-keys -t $SESSIONNAME "cd ../../../qtopology" C-m
    tmux send-keys -t $SESSIONNAME "npm install" C-m
    tmux send-keys -t $SESSIONNAME "tsc" C-m
    tmux split-window -v
    tmux send-keys -t $SESSIONNAME "cd $BASE" C-m
    tmux send-keys -t $SESSIONNAME "cd ../../../NAB" C-m
    tmux select-layout main-vertical

    tmux new-window -t $SESSIONNAME:1 -n dev2
    tmux send-keys -t $SESSIONNAME "cd $BASE" C-m
    tmux send-keys -t $SESSIONNAME "cd ../../docs/uml" C-m
    tmux split-window -h
    tmux send-keys -t $SESSIONNAME "cd $BASE" C-m
    tmux send-keys -t $SESSIONNAME "cd ../../data/nyc_yellow" C-m
    tmux split-window -v
    tmux send-keys -t $SESSIONNAME "cd $BASE" C-m
    tmux select-layout tiled
fi
tmux select-window -t $SESSIONNAME:0
tmux attach -t $SESSIONNAME

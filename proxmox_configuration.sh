#!/bin/bash

if [ "$#" == 2 ] && [ "$1" != '-d' ]
then
    NEW_USER=$1
    NEW_USER_IDENTITY=$2

    useradd -m $NEW_USER
    usermod -aG sudo $NEW_USER
    echo "$NEW_USER ALL=(ALL) NOPASSWD: $(which pvesh) get /cluster/nextid, $(which pvesh) create*, $(which qm) create*, $(which qm) clone*, $(which qm) start*" > "/etc/sudoers.d/$NEW_USER"

    mkdir -p /home/$NEW_USER/.ssh
    echo "$NEW_USER_IDENTITY" >> /home/$NEW_USER/.ssh/authorized_keys

elif [ "$#" == 2 ] && [ "$1" == '-d' ]
then
    USER=$2

    userdel $USER
    rm "/etc/sudoers.d/$USER"
    rm -r "/home/$USER"

else
    echo "Usage: $(basename $0) <-d USER | USER USER_ID>"

fi

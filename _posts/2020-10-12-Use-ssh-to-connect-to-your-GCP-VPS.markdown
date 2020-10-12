---
layout: post
comments: false
title:  "Use ssh to Connect to your VPS in GCP"
excerpt: "..."
date:   2020-10-12 19:00:00
mathjax: false
---

*I am a lazy boy, so if there is an easier way to connect to my VPS in GCP than using Chrome window I will definitely choose it.*


## Environment

- Ubuntu 20.04

## Step 1: You need to get your ssh key of your local device
*If already got it, pass step1.*
Let's use command **ssh-keygen** to generate ssh key! Then you got two files:
- ```id_rsa``` The private key
- ```id_rsa.pub``` The public key


## Step 2: Add your public key to Google Cloud Server
Click "metadata" -> "SSH Keys" -> "Edit", and add your public-key here as instructed below:
<div class="imgcap">
<img src="/assets/ssh_gcp/b2_1.png">
</div>

## Step 3: Adjust the configs as what the fuck you want to

Connect to the target VPS, then type command ```vim /etc/ssh/sshd_config``` to open ssh config file.

- Change ```PermitRootLogin``` to ```yes``` 
- Change ```PubkeyAuthentication``` to ```yes```
- If you want Password Authentication, change ```PasswordAuthentication``` to ```yes``` and ensure you have set password for user.

## Step 4: Enjoy it


 
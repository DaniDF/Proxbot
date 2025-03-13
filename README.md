# Proxbot

Proxbot is a Telegram bot that provides a seamless interface for deploying and managing virtual machines on a Proxmox cluster. It leverages Proxmox's API to automate tasks such as VM creation and resource allocation. Users can execute commands to provision VMs and LXC containers all directly from within the Telegram app. The bot supports template deployment making it an efficient tool for managing Proxmox environments.

___



## Table of content

[toc]

## Installation

* Clone this repo:

  ```sh
  git clone https://github.com/DaniDF/Proxbot
  ```

* Install the requirements:

  ```sh
  npm install
  ```

  

## File requirements

### parameters.json

For working properly Proxbot needs a JSON file that describes the paths for all the configuration files:

```json
{
    "qm_executor_file": "path_to_the_file.json",
    "token_file": "path_to_the_file.json",
    "whitelist_file": "path_to_the_file.json",
    "default_config": "path_to_the_file.json",
    "default_template": "path_to_the_file.json",
    "remote_host": "hostname",
    "remote_user": "username"
}
```

### token_file

<code>token_file</code> contains the unique token provided by Telegram through [Botfather][botfather_link] during the bot creation process. An example below

```
1234567890:ABCDEFGHIJKLMNOPQRSTU_WZYZ_ABCDEFGH
```

[botfather_link]: https://telegram.me/BotFather "Botfather - Telegram.org"

### whitelist_file

<code>whitelist_file</code> defines the allowed users and the allowed groups for using this bot.

An whitelisted user can use the bot in its private chat and only in whitelisted groups. **Not** listed user or groups can not interact white the bot.

```json
{
    "whitelist_users":["User1", "User1", "User2", "User3"],
    "whitelist_groups":["Group0", "Group1", "Group2", "Group3"]
}
```

### default_config

In the <code>default_config</code> can be described all the possible machines and their associated standard configuration (*can be expanded to more machine types, not limited to "qemu" and "lxc"*).

***NOTE***: a defined configuration is assumed <code>number</code>, <code>boolean</code> or <code>string</code>, and can have only that type, based on the value in *default_config* value.

*E.g*: "start_on_boot" in qemu in assumed <code>boolean</code>

```json
{
    "qemu": {
        "sockets": 1,
        "cores": 4,
        "memory": 1024,
        "iso": "debian-12.9.0-amd64-netinst.iso",
        "disk": "qemu_disk",
        "start_at_boot": true,
        "cluster_node": "pve1"
    },
    "lxc": {
        "cpu_units": 1,
        "cores": 2,
        "template": "ubuntu-24.04-standard_24.04-2_amd64.tar.zst",
        "memory": 1024,
        "swap": 512,
        "address": "0.0.0.0/0",
        "bridge": "vmbr0",
        "disk": 32,
        "start_at_boot": true,
        "cluster_node": "pve1"
    }
}
```

### default_template

The file <code>default_template</code> contains a list of all the possible templates.

```json
[
    { "name": "machine_template_0", "id": 100},
    { "name": "machine_template_1", "id": 101},
    { "name": "machine_template_2", "id": 102},
    { "name": "machine_template_3", "id": 103}
]
```



## Execution

To run the bot see (parameters.json):

```sh
nodejs path_to_parameters.json
```



## Container

Proxbot is container ready.

### Command line docker

* Build the Proxbot docker image:

  ```sh
  docker build -t proxbot:latest \
    --build-arg REMOTE_HOST="remote_host.com" \
    --build-arg SSH_KEY_NAME="key" \
    .
  ```

* Run the Proxbot image:

  ```sh
  docker run \
    --name proxbot \
    --restart=unless-stopped \
    -v ./data:/Proxbot-data \
    -v ./ssh_keys:/ssh:ro \
    proxbot
  ```
  
  

### Compose

* Modify the <code>compose.yaml</code> file:

  Change <code>REMOTE_HOST</code> and <code>SSH_KEY_NAME</code> according to the deployed setup

  ```yaml
  services:
    proxbot:
      build:
        context: .
        args:
          - REMOTE_HOST=remote_host.com
          - SSH_KEY_NAME=key
      container_name: "proxbot"
      volumes:
        - ./data:/Proxbot-data
        - ./ssh_keys:/ssh:ro
      deploy:
        restart_policy:
          condition: "unless-stopped"
  
  ```

  

* Build and run Proxbot image:

  ```sh
  docker compose up -d
  ```

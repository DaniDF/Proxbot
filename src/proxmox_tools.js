export { deploy_new_qemu, deploy_new_lxc, deploy_clone_templete, set_user_host }

import { exec } from 'child_process'
import { Logger } from "./logger.js"
import { DeplymentError } from './errors.js'

var user
var host

function set_user_host(username, hostname) {
    user = username
    host = hostname
}

async function deploy_new_qemu(machine_name, config, positive_handler, error_handler) {
    Logger.debug("Recived qemu config --> " + JSON.stringify(config))
    
    get_next_id(user, host, (next_id) => {
        let command_create = "qm create " + next_id +
            " --agent 1 " + 
            " --cores " + config.cores +
            " --memory " + config.memory +
            " --name \"" + machine_name + "\""+
            ((config.start_at_boot)? " --onboot 1" : "")
            " --sockets " + config.sockets +
            " --start 1"
            
        let command_start = "qm start " + next_id
        
        execute_command(user, host, command_create, positive_handler, error_handler)

    }, error_handler)
}

function deploy_new_lxc(machine_name, config, positive_handler, error_handler) {
    Logger.debug("Recived lxc config --> " + JSON.stringify(config))
    
    get_next_id(user, host, (next_id) => {
        let command_create = "pvesh create /nodes/" + config.cluster_node + "/lxc" +
            " -vmid " + next_id + 
            " -ostemplate local:vztmpl/" + config.template +
            " -cores " + config.cores + " -cpuunits " + config.cpu_units +
            " -memory " + config.memory +
            " -swap " + config.swap +
            " -hostname \"" + machine_name + "\"" +
            " -net1 name=eth0,ip=" + config.address + ",bridge=" + config.bridge +
            " -rootfs local:" + config.disk +
            ((config.start_at_boot)? " -onboot 1" : "")
        
        let command_start = "pvesh create /nodes/" + config.cluster_node + "/lxc/" + next_id + "/status/start"

        execute_command(user, host, command_create,
            () => { execute_command(user, host, command_start, positive_handler, error_handler) },
            error_handler
        )

    }, error_handler)
}

function deploy_clone_templete(machine_name, config, positive_handler, error_handler) {
    Logger.debug("Recived template config --> " + JSON.stringify(config))
    
    get_next_id(user, host, (next_id) => {
        let command_create = "qm clone " + config.id + " " + next_id +
        " --format qcow2 " + 
        " --full true" +
        " --name \"" + machine_name + "\""

        let command_start = "qm start " + next_id

        execute_command(user, host, command_create,
            () => { execute_command(user, host, command_start, positive_handler, error_handler) },
            error_handler
        )

    }, error_handler)
}

function get_next_id(user, host, positive_handler, error_handler) {
    let command = "pvesh get /cluster/nextid"
    execute_command(user, host, command, positive_handler, error_handler)
}

function execute_command(user, host, command, positive_handler, error_handler) {
    let ssh_remote_host = user + "@" + host
    if(user === undefined || user.length === 0 || host === undefined || host.length === 0) {
        error_handler(new DeplymentError("Imposssible to connect to the remote host (" + ssh_remote_host + ")"))
    }

    if(command === undefined || command.length === 0) {
        error_handler(new DeplymentError("Impossible to execute empty commands"))
    }

    try {
        var output_data = ""
        let proc_exec = exec("ssh " + ssh_remote_host + " sudo " + command, (error, stdout, stderr) => {
            if(error) {
                error_handler(error.message)
            } else if (stderr) {
                error_handler(stderr.toString())
            } else {
                positive_handler(output_data.toString().trim().replace("\n$", ""))
            }
        })

        
        proc_exec.stdout.on("data", (data) => {
            output_data += data
            Logger.debug("Remote host (" + ssh_remote_host + ") output: " + data.toString().trim().replace("\n$", ""))
        })
        proc_exec.stderr.on("data", (data) => {
            error_handler(data)
        })
        
    } catch(error) {
        error_handler(new DeplymentError(ssh_remote_host + ": " + error.message))
    }
}
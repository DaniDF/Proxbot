export {deploy_new_qemu, deploy_new_lxc, deploy_clone_templete }

import { Logger } from "./logger.js"

function deploy_new_qemu(config) {
    Logger.debug("Recived qemu config --> " + JSON.stringify(config))
    return true
}

function deploy_new_lxc(config) {
    Logger.debug("Recived lxc config --> " + JSON.stringify(config))
    return true
}

function deploy_clone_templete(config) {
    Logger.debug("Recived template config --> " + JSON.stringify(config))
    return true
}
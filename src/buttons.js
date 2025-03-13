export { button_back, button_proceed, button_cancel, button_confirm, button_qemu, button_lxc }

const button_back = {
    text: "🔙 Back",
    callback_data: "back"
}

const button_proceed = {
    text: "Proceed ➡️",
    callback_data: "proceed"
}

const button_cancel = {
    text: "Cancel ❌",
    callback_data: "back"
}

const button_confirm = {
    text: "Confirm ✅",
    callback_data: "confirm"
}

const button_qemu = {
    text: "Qemu",
    callback_data: "machine_tuning_qemu"
}

const button_lxc = {
    text: "Lxc",
    callback_data: "machine_tuning_lxc"
}
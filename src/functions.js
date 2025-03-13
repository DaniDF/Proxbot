export { back, create_new, machine_tuning, delete_existing, help, generate_action_from_config_obj, generate_action_from_template_obj, cmds, actions }

import { get_sender, delete_prev_message, send_updateble_message, send_message, capitalise_first, sanitise_for_markdown, sanitise_input } from './utils.js'
import { Logger } from './logger.js'
import { button_back, button_proceed, button_cancel, button_confirm, button_qemu, button_lxc } from './buttons.js'
import { deploy_new_qemu, deploy_new_lxc, deploy_clone_templete } from './proxmox_tools.js'

const cmds = [
    {
        name: "create_new",
        func: create_new
    },
    {
        name: "clone_from_template",
        func: clone_from_template
    },
    {
        name: "delete",
        func: delete_existing
    },
    {
        name: "help",
        func: help
    }
]

var actions = [
    {
        name: "machine_tuning_qemu",
        func: machine_tuning
    },
    {
        name: "machine_tuning_lxc",
        func: machine_tuning
    },
    {
        name: "back",
        func: back
    },
    {
        name: "cancel",
        func: create_new
    },
    {
        name: "proceed",
        func: proceed
    },
    {
        name: "confirm",
        func: deploy_machine
    }
]

///////////////////////////////////////////////////////////////////////////////
//                          Button Handlers                                  //
///////////////////////////////////////////////////////////////////////////////

function back(context) {
    if(context.session.nav.length > 1) {
        context.session.nav.pop()
        context.session.nav[context.session.nav.length-1].fn(context)
        Logger.debug(
            get_sender(context) + ": Nav -->" + ((context.session.nav.length > 1)? " precedent: " +
            context.session.nav[context.session.nav.length-2].fn.name : "") + " current: " +
            context.session.nav[context.session.nav.length-1].fn.name
        )
    } else {
        Logger.debug(get_sender(context) + ": Nav --> pressed back but there is not precedent function")
    }
}

function proceed(context) {
    let buttons = { inline_keyboard: [ [ button_back ] ] }

    context.session.input_handler = (string) => {
        context.session.input_handler = () => {}
        context.session.machine_name = sanitise_input(string)
        delete_prev_message(context)
        confirm_new_machine(context)
    }

    send_updateble_message(context, "Select machine name:", { reply_markup: buttons })
}

///////////////////////////////////////////////////////////////////////////////
//                         Commands Funtions                                 //
///////////////////////////////////////////////////////////////////////////////

function create_new(context) {
    let buttons = { inline_keyboard: [ [ button_qemu, button_lxc ] ] }
    send_updateble_message(context, "What do you want to create?", { reply_markup: buttons })
}

function clone_from_template(context) {
    let buttons = { inline_keyboard: [] }

    context.session.templates.forEach(template => {
        buttons.inline_keyboard.push([ { text: template.name, callback_data: template.name } ])
    })

    send_updateble_message(context, "Which template do you want to clone?", { reply_markup: buttons })
}

function delete_existing(context) {
    send_updateble_message(context, "Not active right now\\! Sorry 😭", { parse_mode: "MarkdownV2" })
}

function help(context)
{
    let command_list = ""

    for(let count = 0; count < cmds.length; count++)
    {
        command_list += "\n★ /" + cmds[count]["name"]
    }

    send_message(context, "*Help command list:*\n" + sanitise_for_markdown(command_list), { parse_mode: "MarkdownV2" })
}

///////////////////////////////////////////////////////////////////////////////
//                    create_new related Funtions                            //
///////////////////////////////////////////////////////////////////////////////

function confirm_new_machine(context) {
    let buttons = { inline_keyboard: [ [ button_back, button_cancel, button_confirm ] ] }

    var message = "*This machine is going to be deployed:*\nName: _" + sanitise_for_markdown(context.session.machine_name) + "_\n"
    Object.entries(context.session.config.values).forEach((conf, _) => {
        let pretty_key = capitalise_first(conf[0].replaceAll("_", " "))
        message += "\n💠 " + sanitise_for_markdown(pretty_key) + ": " + sanitise_for_markdown(conf[1].toString())
    })

    send_updateble_message(context, message + "\n\n Do you want to *confirm*?", { parse_mode: "MarkdownV2", reply_markup: buttons })
}

function machine_tuning(context) {
    let action = context.session.nav[context.session.nav.length-1].action.slice("machine_tuning_".length)

    if(context.session.config === undefined || action !== context.session.config.action) {
        context.session.config = {
            type: action,
            values: context.session.default_config[action] //TODO Could be a feature: even if you change action (qemu <--> lxc) it mantains the value associated to the settings (reference pointing)
        }
    }

    let buttons = {
        inline_keyboard: []
    }
    
    var message = "*Selected configuration:*\n"
    var count = 0
    Object.entries(context.session.config.values).forEach((conf, _) => {
        let pretty_key = capitalise_first(conf[0].replaceAll("_", " "))
        message += "\n💠 " + sanitise_for_markdown(pretty_key) + ": " + sanitise_for_markdown(conf[1].toString())

        if(count % 3 == 0) {
            buttons.inline_keyboard.push([])
        }

        buttons.inline_keyboard[Math.floor(count/3)].push({
            text: pretty_key,
            callback_data: conf[0]
        })

        count += 1
    })
    buttons.inline_keyboard.push([ button_back, button_proceed ])

    message += "\n\nDo you want to change some settings? If not press \"Proceed\""

    send_updateble_message(context, message, { parse_mode: "MarkdownV2", reply_markup: buttons })
}

function machine_tuning_setting_int(context, name) {
    let buttons = { inline_keyboard: [ [ button_back ] ] }
    context.session.input_handler = (string) => {
        let new_value = parseInt(string)
        if(!isNaN(new_value)) {
            Logger.debug(get_sender(context) + ": Set " + name + " to " + new_value)
            context.session.config.values[name] = new_value
            context.session.input_handler = () => {}
            delete_prev_message(context)
            back(context)
        } else {
            delete_prev_message(context)
            send_updateble_message(context, "*Wrong value*", { parse_mode: "MarkdownV2" })
            machine_tuning_setting_int(context, name)
        }
    }

    send_updateble_message(context, "Insert the new value for " + name + " (integer):", { reply_markup: buttons })
}

function machine_tuning_setting_boolean(context, name) {
    context.session.input_handler = (string) => {
        let new_value = (string.toLowerCase() === "true")
        context.session.config.values[name] = new_value
        context.session.input_handler = () => {}
        delete_prev_message(context)
        back(context)
    }
    
    send_updateble_message(context, "Insert the new value for " + name + " (boolean):")
}

function machine_tuning_setting_string(context, name) {
    context.session.input_handler = (string) => {
        context.session.config.values[name] = sanitise_input(string)
        context.session.input_handler = () => {}
        delete_prev_message(context)
        back(context)
    }

    send_updateble_message(context, "Insert the new value for " + name + " (string):")
}

///////////////////////////////////////////////////////////////////////////////
//                clone_from_template related Funtions                       //
///////////////////////////////////////////////////////////////////////////////

function confirm_template(context, name) {
    context.session.templates.forEach((template) => {
        if(template.name == name) {
            context.session.config = {
                type: "template",
                values: {
                    template: template.name,
                    id: template.id
                }
            }
        }
    })

    proceed(context)
}

///////////////////////////////////////////////////////////////////////////////
//                       Deploy related Funtions                             //
///////////////////////////////////////////////////////////////////////////////

function deploy_machine(context) {
    delete_prev_message(context)
    send_message(context, "Wait few seconds, your machine is in creation!")

    Logger.info(get_sender(context) + ": Deploying new machine --> " + JSON.stringify(context.session.config))

    let positive_result_handler = (_) => {
        Logger.info(get_sender(context) + ": machine " + context.session.machine_name + " created successfully")
        send_message(context, "Your machine \"" + context.session.machine_name + "\" has been created successfully!\nMy job here is done 🎉 See you soon. 👋")
    }
    let error_result_handler = (error) => {
        Logger.error(get_sender(context) + ": an error occurred while creating new machine --> " + error)
        send_message(context, "Your machine \"" + context.session.machine_name + "\" can not be created as wanted, an error occurred.\nSorry for the inconvenience 😢")
    }

    if(context.session.config.type == "qemu") {
        deploy_new_qemu(context.session.machine_name, context.session.config.values, positive_result_handler, error_result_handler)

    } else if(context.session.config.type == "lxc") {
        deploy_new_lxc(context.session.machine_name, context.session.config.values, positive_result_handler, error_result_handler)
        
    } else if(context.session.config.type == "template") {
        deploy_clone_templete(context.session.machine_name, context.session.config.values, positive_result_handler, error_result_handler)

    } else {
        Logger.error(get_sender(context) + ": New machine type not supported --> " + JSON.stringify(context.session.config))
    }
}

///////////////////////////////////////////////////////////////////////////////
//                  Dynamic action creation Funtions                         //
///////////////////////////////////////////////////////////////////////////////

function generate_action_from_config_obj(config) {
    Object.entries(config).forEach(config_type => {
        Object.entries(config_type[1]).forEach(settings => {
            let fn
            if(typeof(settings[1]) === 'number') {
                fn = machine_tuning_setting_int
            } else if(typeof(settings[1]) === 'boolean') {
                fn = machine_tuning_setting_boolean
            } else {
                fn = machine_tuning_setting_string
            }

            actions.push({
                name: settings[0],
                func: fn
            })
        })
        
    })
}

function generate_action_from_template_obj(templates) {
    templates.forEach(template => {
        actions.push({
            name: template.name,
            func: confirm_template
        })
    })
}
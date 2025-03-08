export { back, create_new, machine_tuning, delete_existing, help, generate_action_from_config_obj, generate_action_from_template_obj, cmds, actions }

import { delete_prev_message, capitalise_first, sanitise_for_markdown, sanitise_input } from './utils.js'
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
    context.session.nav.pop()
    context.session.nav[context.session.nav.length-1].fn(context)
    Logger.debug(context.chat.username + ": Nav-> precedent: " + context.session.nav[context.session.nav.length-2].fn.name + " current: " + context.session.nav[context.session.nav.length-1].fn.name)
}

function proceed(context) {
    let buttons = { inline_keyboard: [ [ button_back ] ] }

    context.session.input_handler = (string) => {
        context.session.input_handler = () => {}
        context.session.machine_name = sanitise_input(string)
        confirm_new_machine(context)
    }

    delete_prev_message(context)
    context.reply("Select machine name:", { reply_markup: buttons }).then( (msg_id) => {
        context.session.prev_message = msg_id.message_id
    })
}

///////////////////////////////////////////////////////////////////////////////
//                         Commands Funtions                                 //
///////////////////////////////////////////////////////////////////////////////

function create_new(context) {
    let buttons = { inline_keyboard: [ [ button_qemu, button_lxc ] ] }
    delete_prev_message(context)
    context.reply('What do you want to create?', { reply_markup: buttons }).then( (msg_id) => {
        context.session.prev_message = msg_id.message_id
    })
}

function clone_from_template(context) {
    let buttons = { inline_keyboard: [] }

    context.session.templates.forEach(tmpl => {
        buttons.inline_keyboard.push([ { text: tmpl, callback_data: tmpl } ])
    })

    delete_prev_message(context)
    context.reply('Which template do you want to clone?', { reply_markup: buttons }).then( (msg_id) => {
        context.session.prev_message = msg_id.message_id
    })
}

function delete_existing(context) {
    delete_prev_message(context)
    context.reply("Not active right now\\! Sorry 😭", { parse_mode: "MarkdownV2" }).then( (msg_id) => {
        context.session.prev_message = msg_id.message_id
    })
}

function help(context)
{
    let command_list = ""

    for(let count = 0; count < cmds.length; count++)
    {
        command_list += "\n★ /" + cmds[count]["name"]
    }

    delete_prev_message(context)
    context.reply("*Help command list:*\n" + sanitise_for_markdown(command_list), { parse_mode: "MarkdownV2" }).then( (msg_id) => {
        context.session.prev_message = msg_id.message_id
    })
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

    delete_prev_message(context)
    context.session.prev_message = context.reply(message + "\n\n Do you want to *confirm*?", { parse_mode: "MarkdownV2", reply_markup: buttons }).then( (msg_id) => {
        context.session.prev_message = msg_id.message_id
    })
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

    delete_prev_message(context)
    context.reply(message, { parse_mode: "MarkdownV2", reply_markup: buttons }).then( (msg_id) => {
        context.session.prev_message = msg_id.message_id
    })
}

function machine_tuning_setting_int(context, name) {
    let buttons = { inline_keyboard: [ [ button_back ] ] }
    context.session.input_handler = (string) => {
        let new_value = parseInt(string)
        if(!isNaN(new_value)) {
            Logger.debug(context.chat.username + ": Set " + name + " to " + new_value)
            context.session.config.values[name] = new_value
            context.session.input_handler = () => {}
            back(context)
        } else {
            delete_prev_message(context)
            context.reply("*Wrong value*", { parse_mode: "MarkdownV2" } ).then( (msg_id) => {
                context.session.prev_message = msg_id.message_id
            })
            machine_tuning_setting_int(context, name)
        }
    }
    delete_prev_message(context)
    context.reply("Insert the new value for " + name + " (integer):", { reply_markup: buttons }).then( (msg_id) => {
        context.session.prev_message = msg_id.message_id
    })
}

function machine_tuning_setting_boolean(context, name) {
    context.session.input_handler = (string) => {
        let new_value = (string.toLowerCase() === "true")
        context.session.config.values[name] = new_value
        context.session.input_handler = () => {}
        back(context)
    }
    delete_prev_message(context)
    context.reply("Insert the new value for " + name + " (boolean):").then( (msg_id) => {
        context.session.prev_message = msg_id.message_id
    })
}

function machine_tuning_setting_string(context, name) {
    context.session.input_handler = (string) => {
        context.session.config.values[name] = sanitise_input(string)
        context.session.input_handler = () => {}
        back(context)
    }
    delete_prev_message(context)
    context.reply("Insert the new value for " + name + " (string):").then( (msg_id) => {
        context.session.prev_message = msg_id.message_id
    })
}

///////////////////////////////////////////////////////////////////////////////
//                clone_from_template related Funtions                       //
///////////////////////////////////////////////////////////////////////////////

function confirm_template(context, name) {
    context.session.config = {
        type: "template",
        values: {
            template: name
        }
    }

    proceed(context)
}

///////////////////////////////////////////////////////////////////////////////
//                       Deploy related Funtions                             //
///////////////////////////////////////////////////////////////////////////////

function deploy_machine(context) {
    delete_prev_message(context)
    context.reply("Wait few seconds, your machine is in creation!")

    Logger.info(context.chat.username + ": Deploying new machine --> " + JSON.stringify(context.session.config))

    var result = false
    if(context.session.config.type == "qemu") {
        result = deploy_new_qemu(context.session.config.values)

    } else if(context.session.config.type == "lxc") {
        result = deploy_new_lxc(context.session.config.values)
        
    } else if(context.session.config.type == "template") {
        result = deploy_clone_templete(context.session.config.values)

    } else {
        Logger.error(context.chat.username + ": New machine type not supported --> " + JSON.stringify(context.session.config))
    }

    if(result) {
        context.reply("Your machine \"" + context.session.machine_name + "\" has been created successfully!\nMy job here is done 🎉 See you soon. 👋")
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

function generate_action_from_template_obj(template) {
    template.forEach(tmpl => {
        actions.push({
            name: tmpl,
            func: confirm_template
        })
    })
}
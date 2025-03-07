export { back, create_new, machine_tuning, delete_existing, help, generate_action_from_config, cmds, actions }

import { delete_prev_message, capitalise_first, sanitise_for_markdown } from './utils.js'
import { Logger } from './logger.js'
import { button_back, button_proceed, button_cancel, button_confirm, button_qemu, button_lxc } from './buttons.js'

const cmds = [
    {
        name: "create_new",
        func: create_new
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

function back(context) {
    context.session.nav.pop()
    context.session.nav[context.session.nav.length-1].fn(context)
    Logger.debug(context.chat.username + ": Nav-> precedent: " + context.session.nav[context.session.nav.length-2].fn.name + " current: " + context.session.nav[context.session.nav.length-1].fn.name)
}

function proceed(context) {
    let buttons = { inline_keyboard: [ [ button_back ] ] }

    context.session.input_handler = (string) => {
        context.session.input_handler = () => {}
        context.session.machine_name = string
        confirm_machine(context)
    }

    delete_prev_message(context)
    context.reply("Select machine name:", { reply_markup: buttons }).then( (msg_id) => {
        context.session.prev_message = msg_id.message_id
    }
)
}

function confirm_machine(context) {
    let buttons = { inline_keyboard: [ [ button_back, button_cancel, button_confirm ] ] }

    var message = "*This machine is going to be deployed:*\nName: _" + context.session.machine_name + "_\n"
    Object.entries(context.session.config.values).forEach((conf, _) => {
        let pretty_key = capitalise_first(conf[0].replaceAll("_", " "))
        message += "\n💠 " + pretty_key + ": " + sanitise_for_markdown(conf[1].toString())
    })

    delete_prev_message(context)
    context.session.prev_message = context.reply(message + "\n\n Do you want to *confirm*?", { parse_mode: "MarkdownV2", reply_markup: buttons }).then( (msg_id) => {
        context.session.prev_message = msg_id.message_id
    }
)
}

function deploy_machine(context) {
    delete_prev_message(context)
    context.reply("Wait few seconds, your machine is in creation! Bye!")
}

function create_new(context) {
    let buttons = { inline_keyboard: [ [ button_qemu, button_lxc ] ] }
    delete_prev_message(context)
    context.reply('What do you want to create?', { reply_markup: buttons }).then( (msg_id) => {
        context.session.prev_message = msg_id.message_id
    }
)
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
        message += "\n💠 " + pretty_key + ": " + sanitise_for_markdown(conf[1].toString())

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
    }
)
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
            }
        )
            machine_tuning_setting_int(context, name)
        }
    }
    delete_prev_message(context)
    context.reply("Insert the new value for " + name + " (integer):", { reply_markup: buttons }).then( (msg_id) => {
        context.session.prev_message = msg_id.message_id
    }
)
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
    }
)
}

function machine_tuning_setting_string(context, name) {
    context.session.input_handler = (string) => {
        context.session.config.values[name] = string
        context.session.input_handler = () => {}
        back(context)
    }
    delete_prev_message(context)
    context.reply("Insert the new value for " + name + " (string):").then( (msg_id) => {
        context.session.prev_message = msg_id.message_id
    }
)
}

function delete_existing(context) {
    delete_prev_message(context)
    context.reply("Not active right now\\! Sorry 😭", { parse_mode: "MarkdownV2" }).then( (msg_id) => {
        context.session.prev_message = msg_id.message_id
    }
)
}

function help(context)
{
    let result = "Help command list:"

    for(let count = 0; count < cmds.length; count++)
    {
        result += "\n/" + cmds[count]["name"]
    }

    delete_prev_message(context)
    context.reply(result).then( (msg_id) => {
            context.session.prev_message = msg_id.message_id
        }
    )
}

function generate_action_from_config(config) {
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
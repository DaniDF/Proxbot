import { Telegraf, session } from 'telegraf'
import { message } from 'telegraf/filters'
import * as fs from 'fs'
import { Logger } from './logger.js'
import { cmds, actions, generate_action_from_config_obj, generate_action_from_template_obj } from './functions.js'
import { get_username, log_user_message, log_user_action, check_user_whitelist, update_forward_nav, delete_prev_message, get_bot_name } from './utils.js'
import { set_user_host } from "./proxmox_tools.js"



if(process.argv.length !== 3) {
    Logger.fatal("Error: not enough parameter\nUsage: node " + process.argv[1] + " <config_file>")
    Logger.fatal("<config_file>: ")
    process.exit(-1)
}

const CONFIGS_FILE = process.argv[2]

main()

function main() {
    let configs
    try {
        configs = JSON.parse(fs.readFileSync(CONFIGS_FILE).toString())
        set_user_host(configs.remote_user, configs.remote_host)
    } catch (e) {
        Logger.fatal('Error: can not read CONFIGS_FILE ' + CONFIGS_FILE + '\n' + e)
        return
    }


    let token
    try {
        token = fs.readFileSync(configs.token_file).toString()
    } catch (e) {
        Logger.fatal('Error: can not read TOKEN_FILE ' + configs.token_file + '\n' + e)
        return
    }

    let whitelist
    try {
        whitelist = JSON.parse(fs.readFileSync(configs.whitelist_file))
    } catch (e) {
        Logger.fatal('Error: WHITELIST_FILE ' + configs.whitelist_file + '\n' + e)
        return
    }

    let defaultconfig
    try {
        defaultconfig = JSON.parse(fs.readFileSync(configs.default_config))
    } catch (e) {
        Logger.fatal('Error: DEFAULT_CONFIG_FILE ' + configs.default_config + '\n' + e)
        return
    }
    generate_action_from_config_obj(defaultconfig)

    let defaultTemplates
    try {
        defaultTemplates = JSON.parse(fs.readFileSync(configs.default_template))
    } catch (e) {
        Logger.fatal('Error: DEFAULT_TEMPLATE_FILE ' + configs.default_template + '\n' + e)
        return
    }
    generate_action_from_template_obj(defaultTemplates)

    const bot = new Telegraf(token.toString())
    bot.use(session({
        defaultSession: () => ({
            default_config: defaultconfig,
            templates: defaultTemplates,
            nav: [{ fn: ()=>{} }],
            input_handler: () => {}
        })
    }))

    bot.start(context => {
        log_user_message(context)
        context.reply('Welcome ' + get_username(context) + '. For /help')
    })

    bot.on(message("text"), context => {
        if(context.message.text[0] === "/") {
            execute_commands(context, context.message.text, context => check_user_whitelist(context, whitelist))
        } else {
            context.session.input_handler(context.message.text)
        }
    })

    //define_commands(bot, context => check_user_whitelist(context, whitelist))
    define_actions(bot, context => check_user_whitelist(context, whitelist))

    bot.launch()

    Logger.info("Bot started")
}

function execute_commands(context, command, filter) {
    cmds.forEach(cmd => {
        if(cmd.name == command.slice(1) || (cmd.name + "@" + get_bot_name(context)) == command.slice(1)){
            log_user_message(context)
            command_action_handler(context, cmd.name, cmd.func, filter)
        }
    })
}

function define_actions(bot, filter) {
    actions.forEach(action => {
        bot.action(action.name, context => {
            log_user_action(context)
            command_action_handler(context, action.name, action.func, filter)
        })
    })
}

function command_action_handler(context, name, func, filter) {
    if(name !== "back") {
        update_forward_nav(context, { fn: func, action: name })
    }

    if(filter(context)) {
        delete_prev_message(context)
        func(context, name)
    }
}
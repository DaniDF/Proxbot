import { Telegraf, session } from 'telegraf'
import { message } from 'telegraf/filters'
import * as fs from 'fs'
import { Logger } from './logger.js'
import { cmds, actions, generate_action_from_config_obj, generate_action_from_template_obj } from './functions.js'
import { log_user_message, log_user_action, check_user_whitelist, update_forward_nav } from './utils.js'



if(process.argv.length !== 7) {
    Logger.fatal("Error: not enough parameter\nUsage: node " + process.argv[1] + " <qm executor file> <token_file> <whitelist_file> <default_config> <default_template>")
    Logger.fatal("<qm executor file>: ")
    Logger.fatal("<token_file>: A plain text file containing the Telegram Bot authentication token (see https://telegram.me/BotFather).")
    Logger.fatal("<whitelist_file>: A JSON file containing an object with a property \"whitelist\" that is an array of strings representing all the allowed Telegram users for this bot.")
    Logger.fatal("<default_config>: ")
    Logger.fatal("<default_template>: ")
    process.exit(-1)
}

const QM_FILE = process.argv[2]
const TOKEN_FILE = process.argv[3]
const WHITELIST_FILE = process.argv[4]
const DEFAULT_CONFIG_FILE = process.argv[5]
const DEFAULT_TEMPLATE_FILE = process.argv[6]

main()

function main() {
    let token
    try {
        token = fs.readFileSync(TOKEN_FILE).toString()
    } catch (e) {
        Logger.fatal('Error: can not read TOKEN_FILE' + TOKEN_FILE + '\n' + e)
        return
    }

    let whitelist
    try {
        whitelist = JSON.parse(fs.readFileSync(WHITELIST_FILE))
    } catch (e) {
        Logger.fatal('Error: WHITELIST_FILE' + WHITELIST_FILE + '\n' + e)
        return
    }

    let defaultconfig
    try {
        defaultconfig = JSON.parse(fs.readFileSync(DEFAULT_CONFIG_FILE))
    } catch (e) {
        Logger.fatal('Error: DEFAULT_CONFIG_FILE' + DEFAULT_CONFIG_FILE + '\n' + e)
        return
    }
    generate_action_from_config_obj(defaultconfig)

    let defaultTemplates
    try {
        defaultTemplates = JSON.parse(fs.readFileSync(DEFAULT_TEMPLATE_FILE))
    } catch (e) {
        Logger.fatal('Error: DEFAULT_TEMPLATE_FILE' + DEFAULT_TEMPLATE_FILE + '\n' + e)
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
        context.reply('Welcome ' + context.chat.username + '. For /help')
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

function define_commands(bot, filter) {
    cmds.forEach(cmd => {
        bot.command(cmd.name, context => {
            log_user_message(context)
            command_action_handler(context, cmd.name, cmd.func, filter)
        })
    })
}

function execute_commands(context, command, filter) {
    cmds.forEach(cmd => {
        if(cmd.name == command.slice(1)){
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
        //Logger.debug("Serving: " + context.message.message_id + " -> " + name)
        func(context, name)
        //Logger.debug("Service finished: " + context.message.message_id)
    }
}
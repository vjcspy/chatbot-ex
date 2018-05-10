import {BotFrameworkAdapter} from 'botbuilder';
import * as restify from 'restify';
import {makePersistUserData} from "./jobs/resersve-table/waterfall/persist-user-data";

// Create server
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`${server.name} listening to ${server.url}`);
});

// Create adapter
const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// make sure you define dialogs and conversation before process activity
const {dialogs, conversationState} = makePersistUserData(adapter);

// Listen for incoming requests 
server.post('/api/messages', (req, res) => {
    // Route received request to adapter for processing
    adapter.processActivity(req, res, async (context) => {
        const isMessage = context.activity.type === 'message';

        // State will store all of your information
        const state = conversationState.get(context);
        const dc    = dialogs.createContext(context, state);

        if (isMessage) {
            // Check for valid intents
            if (context.activity.text.match(/hi/ig)) {
                await dc.begin('greeting');
            }
            else if (context.activity.text.match(/(reserve)(.*)(table)/ig)) {
                await dc.begin('reserveTableAndPersistUserData');
            }
        }

        if (!context.responded) {
            // Continue executing the "current" dialog, if any.
            await dc.continue();

            if (!context.responded && isMessage) {
                // Default message
                await context.sendActivity("Hi! I'm a simple bot. Please say 'Hi' or 'Reserve table'.");
            }
        }
    });
});
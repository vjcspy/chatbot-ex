import {FileStorage, ConversationState, UserState, BotStateSet, MemoryStorage} from "botbuilder";
import {BotFrameworkAdapter} from "botbuilder/lib/botFrameworkAdapter";
import {dialogs} from "../waterfall";

let storage, conversationState, userState;
export const makePersistUserData = (adapter: BotFrameworkAdapter) => {

    if (!storage) {
        storage           = new FileStorage("/Users/vjcspy/MS-BOT/bot-ex/_storage");
        conversationState = new ConversationState(storage);
        userState         = new UserState(storage);
    }


    // Add middleware state. In last example we use MemoryStorage, here we use FileStorage
    // The BotStateSet can manage both the ConversationState and UserState at the same time. When it comes time to save user data, you can choose.
    // The Bot Builder SDK provide three state objects with different scopes that you can choose from.
    //
    //     State	                Scope	Description
    //     dc.activeDialog.state	dialog	State available to the steps of the waterfall dialog.
    //     ConversationState	    conversation	State available to current conversation.
    //     UserState	user	    State available accross multiple conversations.
    adapter.use(new BotStateSet(conversationState, userState));


    // Reserve a table:
    // Help the user to reserve a table
    dialogs.add('reserveTableAndPersistUserData', [
        async function (dc, args, next) {
            await dc.context.sendActivity("Welcome to the reservation service.");

            dc.activeDialog.state.reservationInfo = {}; // Clears any previous data
            await dc.prompt('dateTimePrompt', "Please provide a reservation date and time.");
        },
        async function (dc, result) {
            dc.activeDialog.state.reservationInfo.dateTime = result[0].value;

            // Ask for next info
            await dc.prompt('partySizePrompt', "How many people are in your party?");
        },
        async function (dc, result) {
            dc.activeDialog.state.reservationInfo.partySize = result;

            // Ask for next info
            await dc.prompt('textPrompt', "Who's name will this be under?");
        },
        async function (dc, result) {
            dc.activeDialog.state.reservationInfo.reserveName = result;

            // Persist data
            var convo             = conversationState.get(dc.context);
            convo.reservationInfo = dc.activeDialog.state.reservationInfo;

            // Confirm reservation
            var msg = `Reservation confirmed. Reservation details:
            <br/>Date/Time: ${dc.activeDialog.state.reservationInfo.dateTime}
            <br/>Party size: ${dc.activeDialog.state.reservationInfo.partySize}
            <br/>Reservation name: ${dc.activeDialog.state.reservationInfo.reserveName}`;

            await dc.context.sendActivity(msg);
            await dc.end();
        }
    ]);

    return {conversationState, dialogs};
};
import * as BotBuilderDialogs from 'botbuilder-dialogs';

export const dialogs = new BotBuilderDialogs.DialogSet();

// Greet user:
// Ask for the user name and then greet them by name.
dialogs.add('greetings', [
    async dc => {
        await dc.prompt('textPrompt', 'What is your name?');
    },
    async (dc, results) => {
        var userName = results;
        await dc.context.sendActivity(`Hello ${userName}!`);
        await dc.end(); // Ends the dialog
    }
]);

// define textPrompt will use BotBuilderDialogs.TextPrompt
dialogs.add('textPrompt', new BotBuilderDialogs.TextPrompt());
dialogs.add('dateTimePrompt', new BotBuilderDialogs.DatetimePrompt());
dialogs.add('partySizePrompt', new BotBuilderDialogs.NumberPrompt());

// Reserve a table:
// Help the user to reserve a table
var reservationInfo = {
    dateTime: null,
    partySize: null,
    reserveName: null
};

dialogs.add('reserveTable', [
    async function (dc, args, next) {
        await dc.context.sendActivity("Welcome to the reservation service.");

        reservationInfo = {
            dateTime: null,
            partySize: null,
            reserveName: null
        };

        await dc.prompt('dateTimePrompt', "Please provide a reservation date and time.");
    },
    async function (dc, result) {
        reservationInfo.dateTime = result[0].value;

        // Ask for next info
        await dc.prompt('partySizePrompt', "How many people are in your party?");
    },
    async function (dc, result) {
        reservationInfo.partySize = result;

        // Ask for next info
        await dc.prompt('textPrompt', "Who's name will this be under?");
    },
    async function (dc, result) {
        reservationInfo.reserveName = result;

        // Reservation confirmation
        var msg = `Reservation confirmed. Reservation details: 
            <br/>Date/Time: ${reservationInfo.dateTime} 
            <br/>Party size: ${reservationInfo.partySize} 
            <br/>Reservation name: ${reservationInfo.reserveName}`;
        await dc.context.sendActivity(msg);
        await dc.end();
    }
]);
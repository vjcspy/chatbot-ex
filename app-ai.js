// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {BotFrameworkAdapter, BotStateSet, ConversationState, MemoryStorage, TurnContext, UserState} = require('botbuilder');
const {LuisRecognizer, QnAMaker} = require('botbuilder-ai');
const {DialogSet} = require('botbuilder-dialogs');
const restify = require('restify');

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

// Create LuisRecognizers and QnAMaker
// The LUIS applications are public, meaning you can use your own subscription key to test the applications.
// For QnAMaker, users are required to create their own knowledge base.
// The exported LUIS applications and QnAMaker knowledge base can be found adjacent to this sample bot.

// The corresponding LUIS application JSON is `dispatchSample.json`
const dispatcher = new LuisRecognizer({
  appId: 'd5b8aeed-5c97-4278-8d1c-e0329322c110',
  subscriptionKey: "cf98af67681e4f25a61922fc386724f5",
  serviceEndpoint: 'https://westus.api.cognitive.microsoft.com/',
  verbose: true,
  options: {
    staging: true
  }
});

// The corresponding LUIS application JSON is `homeautomation.json`
const homeAutomation = new LuisRecognizer({
  appId: '8298b589-fd98-4269-9096-65b14ce70e60',
  subscriptionKey: "cf98af67681e4f25a61922fc386724f5",
  serviceEndpoint: 'https://westus.api.cognitive.microsoft.com/',
  verbose: true,
  options: {
    staging: true
  }
});

// The corresponding LUIS application JSON is `weather.json`
const weather = new LuisRecognizer({
  appId: 'd2aabb93-536f-40dd-8278-b080a11566fd',
  subscriptionKey: "cf98af67681e4f25a61922fc386724f5",
  serviceEndpoint: 'https://westus.api.cognitive.microsoft.com/',
  verbose: true,
  options: {
    staging: true
  }
});

// The QnAMaker knowledge base used in this sample is `sampleKnowledgeBase.tsv`
// To create a new service, upload this knowledge base by going to QnA Maker at https://qnamaker.ai/Create
// const faq = new QnAMaker(
//     {
//         knowledgeBaseId: '',
//         endpointKey: '',
//         host: ''
//     },
//     {
//         answerBeforeNext: true
//     }
// );

// Add state middleware
const storage = new MemoryStorage();
const convoState = new ConversationState(storage);
const userState = new UserState(storage);
adapter.use(new BotStateSet(convoState, userState));

// Register some dialogs for usage with the LUIS apps that are being dispatched to
const dialogs = new DialogSet();

// Helper function to retrieve specific entities from LUIS results
function findEntities(entityName, entityResults) {
  let entities = []
  if (entityName in entityResults) {
    entityResults[entityName].forEach(entity => {
      entities.push(entity);
    });
  }
  return entities.length > 0 ? entities : undefined;
}

// Setup dialogs
dialogs.add('HomeAutomation_TurnOff', [
  async (dialogContext, args) => {
    const devices = findEntities('HomeAutomation_Device', args.entities);
    const operations = findEntities('HomeAutomation_Operation', args.entities);

    const state = convoState.get(dialogContext.context);
    state.homeAutomationTurnOff = state.homeAutomationTurnOff ? state.homeAutomationTurnOff + 1 : 1;
    await dialogContext.context.sendActivity(`${state.homeAutomationTurnOff}: You reached the "HomeAutomation_TurnOff" dialog.`);
    if (devices) {
      await dialogContext.context.sendActivity(`Will turn off device:\n${devices.join(', ')}`);
    }
    if (operations) {
      await dialogContext.context.sendActivity(`Confirm operation:\n${operations.join(', ')}`);
    }
    await dialogContext.end();
  }
]);

dialogs.add('HomeAutomation_TurnOn', [
  async (dialogContext, args) => {
    const devices = findEntities('HomeAutomation_Device', args.entities);
    const operations = findEntities('HomeAutomation_Operation', args.entities);

    const state = convoState.get(dialogContext.context);
    state.homeAutomationTurnOn = state.homeAutomationTurnOn ? state.homeAutomationTurnOn + 1 : 1;
    await dialogContext.context.sendActivity(`${state.homeAutomationTurnOn}: You reached the "HomeAutomation_TurnOn" dialog.`);
    if (devices) {
      await dialogContext.context.sendActivity(`Will turn on device:\n${devices.join(', ')}`);
    }
    if (operations) {
      await dialogContext.context.sendActivity(`Confirm operation:\n${operations.join(', ')}`);
    }
    await dialogContext.end();
  }
]);

dialogs.add('Weather_GetForecast', [
  async (dialogContext, args) => {
    const locations = findEntities('Weather_Location', args.entities);

    const state = convoState.get(dialogContext.context);
    state.weatherGetForecast = state.weatherGetForecast ? state.weatherGetForecast + 1 : 1;
    await dialogContext.context.sendActivity(`${state.weatherGetForecast}: OK, i will check weather for you.`);
    if (locations) {
      await dialogContext.context.sendActivity(`I will find information weather of:\n${locations.join(', ')}`);
    }
    await dialogContext.end();
  }
]);

dialogs.add('Weather_GetCondition', [
  async (dialogContext, args) => {
    const locations = findEntities('Weather_Location', args.entities);

    const state = convoState.get(dialogContext.context);
    state.weatherGetCondition = state.weatherGetCondition ? state.weatherGetCondition + 1 : 1;
    await dialogContext.context.sendActivity(`${state.weatherGetCondition}: You reached the "Weather_GetCondition" dialog.`);
    if (locations) {
      await dialogContext.context.sendActivity(`I will find information weather of:\n${locations.join(', ')}`);
    }
    await dialogContext.end();
  }
]);

dialogs.add('None', [
  async (dialogContext) => {
    const state = convoState.get(dialogContext.context);
    state.noneIntent = state.noneIntent ? state.noneIntent + 1 : 1;
    await dialogContext.context.sendActivity(`${state.noneIntent}: Sorry, I don't know what you said.`);
    await dialogContext.end();
  }
]);

adapter.use(dispatcher);

// Listen for incoming Activities
server.post('/api/messages', (req, res) => {
  adapter.processActivity(req, res, async (context) => {
    if (context.activity.type === 'message') {
      const state = convoState.get(context);
      const dc = dialogs.createContext(context, state);

      // Retrieve the LUIS results from our dispatcher LUIS application
      const luisResults = dispatcher.get(context);

      // Extract the top intent from LUIS and use it to select which LUIS application to dispatch to
      const topIntent = LuisRecognizer.topIntent(luisResults);

      console.log(topIntent);
      const isMessage = context.activity.type === 'message';
      if (isMessage) {
        switch (topIntent) {
          case 'l_HomeAutomation':
            const homeAutoResults = await homeAutomation.recognize(context);
            const topHomeAutoIntent = LuisRecognizer.topIntent(homeAutoResults);
            await dc.begin(topHomeAutoIntent, homeAutoResults);
            break;
          case 'l_Weather':
            console.log('get weather');
            const weatherResults = await weather.recognize(context);
            console.log(weatherResults);
            const topWeatherIntent = LuisRecognizer.topIntent(weatherResults);
            await dc.begin(topWeatherIntent, weatherResults);
            break;
          default:
            await dc.begin('None');
        }
      }

      if (!context.responded) {
        await dc.continue();
        if (!context.responded && isMessage) {
          await dc.context.sendActivity(`Hi! I'm Home automation and Weather bot. please say some thing.`);
        }
      }
    }
  });
});


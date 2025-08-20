import EventBus from './event-bus.js';
import ConsentManager from './consent.js';

window.analytics = {
  dispatch: EventBus.dispatch,
  consent: ConsentManager
};

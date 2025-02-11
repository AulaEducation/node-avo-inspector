# Avo Inspector SDK for Node.js

[![npm version](https://badge.fury.io/js/node-avo-inspector.svg)](https://badge.fury.io/js/node-avo-inspector)

This is a quick start guide. For more information about the Inspector project please read the [Inspector SDK Reference](https://www.avo.app/docs/implementation/avo-inspector-sdk-reference) and the [Inspector Setup Guide](https://www.avo.app/docs/implementation/setup-inspector-sdk).

# Why was this forked?
At the time of writing, the latest version of node-avo-inspector from the original repository has an issue where the promise returned by `trackSchemaFromEvent` gets resolved before the request to send the event metadata to the tracking endpoint completes. If this function is used in an AWS Lambda, this results in errors since the lambda function finishes before the event metadata request completes. This fork addresses the issue.

# Installation

The library is distributed with npm, install with npm:
```
    npm i node-avo-inspector
```

or yarn:
```
    yarn add node-avo-inspector
```

# Initialization

Obtain the API key from the Inspector tab (Inspector > Manage Sources) in your [Avo workspace](https://www.avo.app/welcome)

```javascript
import * as Inspector from "node-avo-inspector";

let inspector = new Inspector.AvoInspector({
  apiKey: "your api key",
  env: Inspector.AvoInspectorEnv.Dev,
  version: "1.0.0",
  appName: "My app",
});
```

# Integrating with Avo Codegen

The setup is lightweight and is covered [in this guide](https://www.avo.app/docs/implementation/start-using-inspector-with-avo-functions).

Every event sent with your Codegen after this integration will automatically be sent to Inspector.

# Sending event schemas for events reported outside of Codegen

Whenever you send tracking event call the following methods:

Read more in the [Avo documentation](https://www.avo.app/docs/implementation/devs-101#inspecting-events)

This method gets actual tracking event parameters, extracts schema automatically and sends it to the Inspector backend.
It is the easiest way to use the library, just call this method at the same place you call your analytics tools' track methods with the same parameters.

```javascript
inspector.trackSchemaFromEvent("Event name", {
  "String Prop": "Prop Value",
  "Float Prop": 1.0,
  "Boolean Prop": true,
});
```

# Enabling logs

Logs are enabled by default in the dev mode and disabled in prod mode. You can enable and disable logs by calling the `enableLogging` method:

```javascript
inspector.enableLogging(true | false);
```

## Author
Avo (https://www.avo.app), hi@avo.app

## License
AvoInspector is available under the MIT license.

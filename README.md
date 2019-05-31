# oja-context-provider

Provides a folder based resolution of domain and actions for oja/context.
It assumes the app already have oja installed and available via a simple require resolution or can be provided as a createContext option.

## Install

```
$ npm install oja-context-provider -S
```

## Usage

```js
const createProvider = require('oja-context-provider')();

// create provider one time or many times
const createContext = await createProvider([
    'path:src/actions',
    'path:src/other-actions'
]);

// create context and inject some properties or actions that will be merged with the ones discovered.
// NOTE: in-line options will override any discovered ones to allow easy mocking
const context = await createContext(); 

// or with properties
const context = await createContext({properties: {
    foo: 'foov',
    bar: 'barv'
}}); 

console.log(await context.domain1.getFoo());
console.log(context.foo); // >> foov
```

Using in-line actions to override discovered ones

```js
const context = await createContext({
    properties: {
        foo: 'foov',
        bar: 'barv'
    },
    functions: {
        domain1: {
            getFoo: context => {
                // one can access injected properties from context
                return context.foo;
            },
            getBar: context => {
                return context.bar;
            }
        }
    }
});

const fooVal = await context.domain1.getFoo();
```

## Configuration

The resolution of actions are done via initial initialization of the provider, while an actual action load is delayed till context.domain.<action> is accessed.

```js
const createProvider = require('oja-context-provider')();

// create provider one time or many times
// the same folder will be cached
const provider = createProvider([
    'path:src',
    'path:src/other-actions'
], {
    contextFactory, // allows a nice way to inject your version of oja context implementation
    baseDir, // process.cwd() by default
    fileFilter // async filePath => true|false
});
```

Where:
* baseDir is the location from where the path: shortstop handler will start path resolution
* fileFiler is a function that allows a user to decide if the given file is action (true) or not (false)
* contextFactory is oja/context implementation injection
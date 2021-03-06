# Bikini

**Everything a model needs.**

[![Build Status](https://travis-ci.org/mwaylabs/bikini.svg?branch=v0.5.2)](https://travis-ci.org/mwaylabs/bikini)

## What is Bikini

**Bikini** lets you treat  being **offline** as a status. Not as an error.

You're developing a webapp for mobile browsers? You're damn right here! 

With Bikini the user won't even notice that he is offline.
It also improves the user experience by decreasing response latency.

Another cool feature of Bikini is that it keeps your app in sync. This allows you to build high collaborative apps by using [socket.io](http://socket.io/).

Bikini is build on top of [Backbone.js](http://backbonejs.org/) which gives your web application structure.

![mcap mobility platform](http://blog.mwaysolutions.com/wp-content/uploads/2013/12/mway_bikini_blog04.jpg)

You should also have a lot at the [introducing blog-post about Bikini](http://blog.mwaysolutions.com/2013/12/20/offlineonline-synchronization-with-bikini-all-a-model-needs/).

## How to use
Using Bikini is like taking candy from a baby.

```
cd into your project
```

*install bikini via bower*, this will handle all dependencies for you and lets you easily update the library.
```
bower install -S bikini
```
add the libraries to your `.html` file
```html
<script src="bower_components/jquery/jquery.js"></script>
<script src="bower_components/underscore/underscore.js"></script>
<script src="bower_components/socket.io-client/socket.io.js"></script>
<script src="bower_components/backbone/backbone.js"></script>
<script src="bower_components/bikini/bikini.js"></script>
```

*now, let's set up the magic*

first, we need to define our Model and the according Collection
```js
// Configure the Model
// Attribute key to identify the data
var MyBikiniServiceModel = Bikini.Model.extend({
    idAttribute: '_id'
});

// Tell the collection the endpoint url and which model it should use.
// The entity is used for retrieving local stored data
var MyBikiniServiceCollection = Bikini.Collection.extend({
    model: myBikiniServiceModel,
    entity: 'myBikiniService',
    url: 'http://nerds.mway.io:8200/bikini/contacts',
});
```


To fetch data, you can simply call the Backbonejs function fetch()
```js
var myCollection = new MyBikiniServiceCollection();
myBikiniServiceCollection.fetch();
```

You can listen to all the common Backbonejs events such as `sync`.
```js
myCollection.on('sync', function() {
    console.log(arguments);
});
```

### Event reference
See [backbonejs-events](http://backbonejs.org/#Events) for detailed information.


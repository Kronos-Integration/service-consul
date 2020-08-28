[![npm](https://img.shields.io/npm/v/@kronos-integration/service-consul.svg)](https://www.npmjs.com/package/@kronos-integration/service-consul)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![minified size](https://badgen.net/bundlephobia/min/@kronos-integration/service-consul)](https://bundlephobia.com/result?p=@kronos-integration/service-consul)
[![downloads](http://img.shields.io/npm/dm/@kronos-integration/service-consul.svg?style=flat-square)](https://npmjs.org/package/@kronos-integration/service-consul)
[![Build Action Status](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2FKronos-Integration%2Fservice-consul%2Fbadge&style=flat)](https://actions-badge.atrox.dev/Kronos-Integration/service-consul/goto)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/Kronos-Integration/service-consul.git)
[![Styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Known Vulnerabilities](https://snyk.io/test/github/Kronos-Integration/service-consul/badge.svg)](https://snyk.io/test/github/Kronos-Integration/service-consul)
[![Coverage Status](https://coveralls.io/repos/Kronos-Integration/service-consul/badge.svg)](https://coveralls.io/r/Kronos-Integration/service-consul)

# @kronos-integration/service-consul

kronos service to integrate with consul

# usage

# API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

-   [ServiceConsul](#serviceconsul)
    -   [Parameters](#parameters)
    -   [autostart](#autostart)
    -   [\_start](#_start)
    -   [\_stop](#_stop)
    -   [update](#update)
        -   [Parameters](#parameters-1)
    -   [name](#name)

## ServiceConsul

**Extends Service**

service building a bridge to consul

### Parameters

-   `args` **...any** 

### autostart

Start immediate

Returns **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** true

### \_start

Register the kronos service in consul

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)** that fullfills on succesfull startup

### \_stop

Deregister the service from consul

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)** that fullfills when the deregistering has finished

### update

Update service definition in consul

#### Parameters

-   `delay` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** time to wait before doing the unregister/register action

### name

Returns **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** 'consul'

# install

With [npm](http://npmjs.org) do:

```shell
npm install @kronos-integration/service-consul
```

# license

BSD-2-Clause
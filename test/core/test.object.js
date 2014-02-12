describe('M.Object', function () {

    it('basic', function () {
        assert.isDefined(M.Object);
        assert.isDefined(M.Object._type);

        assert.isObject(M.Object);
        assert.isString(M.Object._type);
        assert.equal(M.Object._type, 'M.Object');
    });

    it('methods', function () {
        assert.isDefined(M.Object._create);
        assert.isDefined(M.Object.include);
        assert.isDefined(M.Object.design);
        assert.isDefined(M.Object.implement);
        assert.isDefined(M.Object.hasInterfaceImplementation);
        assert.isDefined(M.Object._create);
        assert.isDefined(M.Object.bindToCaller);
        assert.isDefined(M.Object._init);
        assert.isDefined(M.Object._normalize);
        assert.isDefined(M.Object.handleCallback);
        assert.isDefined(M.Object.getObjectType);

        assert.isFunction(M.Object._create);
        assert.isFunction(M.Object.include);
        assert.isFunction(M.Object.design);
        assert.isFunction(M.Object.implement);
        assert.isFunction(M.Object.bindToCaller);
        assert.isFunction(M.Object._init);
        assert.isFunction(M.Object._normalize);
        assert.isFunction(M.Object.handleCallback);
        assert.isFunction(M.Object.getObjectType);

    });


});

export function createWatchEndpoint(name, owner, makeWatch, dataProvider) {
    let watch;

    const options = {
        createOpposite: true
    };

    options.willBeClosed = () => {
        owner.trace({
            endpoint: this.identifier,
            state: 'close'
        });

        if (watch) {
            watch.end();
            watch = undefined;
        }
    };

    options.hasBeenOpened = () => {
        owner.trace({
            endpoint: this.identifier,
            state: 'open'
        });

        watch = makeWatch();
        watch.on('change', (data, res) => this.opposite.receive(data));
        watch.on('error', err =>
            owner.error({
                error: err,
                endpoint: this.identifier
            })
        );
    };

    const ep = new ReceiveEndpoint(name, owner, options);

    ep.receive = request => {
        if (request) {
            if (request.update && watch === undefined) {
            } else if (request.update === false && watch) {
                watch.end();
                watch = undefined;
            }
        }

        return dataProvider();
    };

    return ep;
}



export async function* serviceURLs(consul,name) {
    let si = [];

    let firstPromise = consul.kv
        .get({
            key: `services/${name}`,
            recurse: true
        })
        .then(data => {
            si = data[0].map(d => d.Value);
            firstPromise = undefined;
            return si.length === 0 ? Promise.reject() : Promise.resolve(si[0]);
        });

    while (firstPromise) {
        yield firstPromise;
        //console.log(`size: ${si.length} ${firstPromise}`);
    }

    if (si.length) {
        for (let i = 1; ; i++) {
            if (i >= si.length) {
                i = 0;
            }
            //console.log(`yield: ${i} ${si.length}`);
            yield Promise.resolve(si[i]);
        }
    }
    return undefined;
}
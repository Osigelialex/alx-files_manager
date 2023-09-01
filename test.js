const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

async function adan(name, fn) {
    await sleep(5000);
    console.log('i am reading adan');
    const err = new Error('error occured')
    fn(name, err);
}

adan('kunle', ()=> {
    // console.log(namme);
})

console.log('rwo');
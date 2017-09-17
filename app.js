const {RippleAPI} = require('ripple-lib'),
      api = new RippleAPI({
        server: 'wss://s2.ripple.com'
      }),
      instructions = {maxLedgerVersionOffset: 5},
      AddressA = '', // Anadir Direccion Origen,
      AddressB = '', // Anadir Direccion Destino,
      DestinationTagB = 0, // Anadir Destination Tag,
      AddressAsecret = '', // Anadir Secret,
      cantidadPago = '1', // XRP,
      payment = {
        source: {
          address: AddressA,
          maxAmount: {
            value: cantidadPago,
            currency: 'XRP'
          }
        },
        destination: {
          address: AddressB,
          tag: DestinationTagB,
          amount: {
            value: cantidadPago,
            currency: 'XRP'
          }
        }
      }

let trxhash

function continuar(mensaje) {
  console.log('continuamos, chequeamos la transaccion')
}

function fallar(mensaje) {
  console.error(mensaje)
  process.exit(1)
}

api.connect().then(() => {
  console.log('Conectados...')
  return api.preparePayment(AddressA, payment, instructions).then(prepared => {
    console.log('Transaccion preparada...', prepared)
    const {signedTransaction,id} = api.sign(prepared.txJSON, AddressAsecret)
    console.log('Transaccion firmada...',signedTransaction)
    trxhash = id
    api.submit(signedTransaction).then(continuar, fallar)
  })
}).catch(fallar)

api.on('ledger', ledger => {
    api.getLedger({
      includeAllData: true,
      includeTransactions: true,
      ledgerVersion: ledger.ledgerVersion
    })
    .then(results => {
      let _diferencia,_json = JSON.parse(results.rawTransactions)
      for (let x=0;x<_json.length;x++) {
        if (_json[x].hash===trxhash) {
          _curr = _json[x].metaData
          for (let i = 0; i < _curr.AffectedNodes.length; i++) {
            _affectedNode = _curr.AffectedNodes[i]
            if (_affectedNode.ModifiedNode && _affectedNode.ModifiedNode.LedgerEntryType === 'AccountRoot'
                && _affectedNode.ModifiedNode.FinalFields.Account === AddressA) {
              _diferencia = _affectedNode.ModifiedNode.PreviousFields.Balance - _affectedNode.ModifiedNode.FinalFields.Balance;
            }
          }
        }
      }
      // Comparamos la cantidad del pago mas la comision de la transaccion (0.000012 XRP) en drops de un millon
      if (_diferencia == ((parseInt(cantidadPago)+0.000012)*1000000).toFixed(0)) {
        // Se ha producido la diferencia que esperabamos
        console.log('✓ Se ha confirmado el pago en el ledger',ledger.ledgerVersion)
        process.exit(0)
      } else {
        // No se ha producido, la transaccion ha fallado o no estaba en este ledger
        console.log('...No se ha confirmado el pago en este ledger',ledger.ledgerVersion)
      }
    })
    .catch((e) => {
      fallar(e)
    })
})





import { ClientButtonInteraction } from '../../client'

export default class YesCheckVerifications extends ClientButtonInteraction {
  constructor () {
    super('NO_CHECK_VERIFICATIONS',
      async (int) => {
        int.update({ embeds: [], components: [], content: 'Acción cancelada.' })
      }
    )
  }
}

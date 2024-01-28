import { ClientButtonInteraction } from '../../client'

export default class CreateBackupCancel extends ClientButtonInteraction {
  constructor () {
    super('CREATE_BACKUP_CANCEL',
      async (int) => {
        int.update({ embeds: [], components: [], content: 'Acción cancelada.' })
      }
    )
  }
}

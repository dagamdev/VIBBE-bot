import { ChannelType, ThreadChannel, type GuildBasedChannel } from 'discord.js'
import { ClientButtonInteraction } from '../../client'
import { BackupModel } from '../../models'
import { type Channel } from '../../models/backup'

export default class LoadBackupConfirm extends ClientButtonInteraction {
  constructor () {
    super('LOAD_BACKUP_CONFIRM',
      async (int) => {
        const { guild, guildId } = int

        const backupId = int.message.embeds[0].footer?.text.split(/ +/g).pop()

        if (backupId === undefined || guild === null) {
          await int.update({
            embeds: [],
            components: [],
            content: 'Ha ocurrido un error. Intenta ejecutar el comando de nuevo. Si persiste el problema, repórtelo.'
          })
          return
        }

        await int.update({ embeds: [], components: [], content: 'Cargando respaldo...' })

        const backupData = await BackupModel.findOne({ id: backupId })

        if (backupData === null) {
          await int.editReply({
            content: 'Ha ocurrido un error. Intenta ejecutar el comando de nuevo. Si persiste el problema, repórtelo.'
          })
          return
        }

        await guild.edit({
          name: backupData.guild.name,
          description: backupData.guild.description
        })

        const roles = await guild.roles.fetch()
        for (const [roleId, role] of roles) {
          if (roleId === guildId) {
            const everyoneRole = backupData.roles.find(f => f.oldId === backupData.guild.id)

            if (everyoneRole !== undefined) {
              await role.edit({
                color: everyoneRole.color,
                hoist: everyoneRole.hoist,
                mentionable: everyoneRole.mentionable,
                permissions: everyoneRole.permissions,
                icon: everyoneRole.icon,
                unicodeEmoji: everyoneRole.unicodeEmoji
              })
            }
          } else if (role.editable) {
            await role.delete()
          }
        }

        const newRoleIDs = new Map<string, string>()
        for (const bcRole of backupData.roles.sort((a, b) => b.rawPosition - a.rawPosition)) {
          if (bcRole.oldId !== backupData.guild.id) {
            const newRole = await guild.roles.create({
              name: bcRole.name,
              color: bcRole.color,
              hoist: bcRole.hoist,
              mentionable: bcRole.mentionable,
              permissions: bcRole.permissions,
              icon: bcRole.icon,
              unicodeEmoji: bcRole.unicodeEmoji
            })

            newRoleIDs.set(bcRole.oldId, newRole.id)
          }
        }

        const channels = await guild.channels.fetch()
        for (const data of channels) {
          const channel = data[1]

          if (channel !== null) {
            await channel.delete()
          }
        }

        function getChannelCreationObject (channelData: Channel, newChannel?: GuildBasedChannel) {
          const parent = newChannel?.id

          return {
            name: channelData.name,
            type: channelData.type,
            parent,
            nsfw: channelData.nsfw ?? undefined,
            rateLimitPerUser: channelData.rateLimitPerUser ?? undefined,
            topic: channelData.topic ?? undefined,
            bitrate: channelData.bitrate ?? undefined,
            rtcRegion: channelData.rtcRegion ?? undefined,
            userLimit: channelData.userLimit ?? undefined,
            videoQualityMode: channelData.videoQualityMode ?? undefined,
            permissionOverwrites: channelData.permissionOverwrites?.map((p) => {
              return {
                id: newRoleIDs.get(p.id) ?? p.id,
                type: p.type,
                allow: p.allow,
                deny: p.deny
              }
            }) ?? undefined
          }
        }

        async function sendWebhookMessages (channelData: Channel, newChannel: GuildBasedChannel) {
          if (channelData.messages.length !== 0 && newChannel.isTextBased() && !(newChannel instanceof ThreadChannel)) {
            const webhook = await newChannel.createWebhook({ name: 'deceiver' })

            for (const msg of channelData.messages) {
              await webhook.send({ username: msg.author.name, content: msg.content })
            }

            await webhook.delete()
          }
        }

        for (const fsChannel of backupData.channels.filter(f => f.parentId === null)) {
          const newChannel = await guild.channels.create(getChannelCreationObject(fsChannel)) as GuildBasedChannel

          await sendWebhookMessages(fsChannel, newChannel)

          if (fsChannel.type === ChannelType.GuildCategory) {
            for (const scChannel of backupData.channels.filter(f => f.parentId === fsChannel.oldId)) {
              const newChildChannel = await guild.channels.create(getChannelCreationObject(scChannel, newChannel)) as GuildBasedChannel

              await sendWebhookMessages(scChannel, newChildChannel)
            }
          }
        }
      }
    )
  }
}

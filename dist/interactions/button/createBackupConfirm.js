"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../../client");
const models_1 = require("../../models");
class CreateBackupConfirm extends client_1.ClientButtonInteraction {
    constructor() {
        super('CREATE_BACKUP_CONFIRM', async (int, client) => {
            const { user, guild, guildId } = int;
            if (guild === null) {
                int.update({ embeds: [], components: [], content: 'No estás dentro de un servidor.' });
                return;
            }
            await int.update({ embeds: [], components: [], content: 'Creando respaldo...' });
            let userData = await models_1.UserModel.findOne({ userId: user.id });
            userData ??= await models_1.UserModel.create({
                userId: user.id
            });
            const iconUrl = guild.iconURL({ size: 1024 });
            let icon;
            if (iconUrl !== null) {
                const res = await fetch(iconUrl);
                if (res.status !== 200)
                    return;
                const arrayBuffer = await res.arrayBuffer();
                icon = await models_1.ImageModel.create({
                    data: Buffer.from(arrayBuffer)
                });
            }
            const roles = await guild.roles.fetch();
            const channels = guild.channels.cache;
            const mappedRoles = roles.filter(f => !f.managed).map((role) => {
                return {
                    oldId: role.id,
                    name: role.name,
                    color: role.color,
                    hoist: role.hoist,
                    rawPosition: role.rawPosition,
                    mentionable: role.mentionable,
                    permissions: role.permissions.bitfield,
                    icon: role.icon,
                    unicodeEmoji: role.unicodeEmoji
                };
            });
            const avatars = [];
            const mappedChannels = [];
            for (const data of channels.filter(f => f !== null)) {
                const channel = data[1];
                const ch = channel;
                const messagesData = [];
                if (!(userData.ignoreChannels.find(f => f.guildId === guildId)?.channelIDs.some(s => s === channel.id || s === channel.parentId) ?? true)) {
                    if (channel.isTextBased()) {
                        const messages = await channel.messages.fetch();
                        for (const msgData of messages) {
                            const msg = msgData[1];
                            if (msg.content.length !== 0 || msg.attachments.size !== 0) {
                                const attachments = [];
                                let avatarRef = null;
                                if (avatars.every(e => e !== msg.author.id)) {
                                    const avatarUrl = msg.author.displayAvatarURL({ size: 128 });
                                    const res = await fetch(avatarUrl);
                                    if (res.status === 200) {
                                        const arrayBuffer = await res.arrayBuffer();
                                        const buffer = Buffer.from(arrayBuffer);
                                        const newAvatar = await models_1.ImageModel.create({
                                            data: buffer
                                        });
                                        avatarRef = newAvatar._id;
                                        avatars.push(msg.author.id);
                                    }
                                }
                                for (const atData of msg.attachments) {
                                    const at = atData[1];
                                    const res = await fetch(at.url);
                                    if (res.status !== 200)
                                        continue;
                                    const arrayBuffer = await res.arrayBuffer();
                                    const buffer = Buffer.from(arrayBuffer);
                                    attachments.push({
                                        name: at.name,
                                        attachment: buffer,
                                        description: at.description
                                    });
                                }
                                messagesData.unshift({
                                    author: {
                                        id: msg.author.id,
                                        name: msg.author.displayName,
                                        avatar: avatarRef
                                    },
                                    content: msg.content,
                                    attachments
                                });
                            }
                        }
                    }
                }
                mappedChannels.push({
                    oldId: ch.id,
                    name: ch.name,
                    parentId: ch.parentId,
                    position: ch.position,
                    type: ch.type,
                    nsfw: ch.nsfw,
                    topic: ch.topic,
                    rateLimitPerUser: ch.rateLimitPerUser,
                    bitrate: ch.bitrate,
                    rtcRegion: ch.rtcRegion,
                    userLimit: ch.userLimit,
                    videoQualityMode: ch.videoQualityMode,
                    permissionOverwrites: ch.permissionOverwrites.cache.map((p) => ({
                        id: p.id,
                        type: p.type,
                        deny: p.deny.bitfield,
                        allow: p.allow.bitfield
                    })),
                    messages: messagesData
                });
            }
            const newBackup = await models_1.BackupModel.create({
                user: userData._id,
                guild: {
                    id: guildId,
                    name: guild.name,
                    icon: icon?._id,
                    description: guild.description
                },
                roles: mappedRoles,
                channels: mappedChannels
            });
            userData.backups.push(newBackup._id);
            await userData.save();
            const backupIDs = client.cache.backupIDs.find(f => f.userId === user.id);
            if (backupIDs === undefined) {
                client.cache.backupIDs.push({
                    userId: user.id,
                    IDs: [{
                            value: newBackup.id,
                            name: `${guild.name} | ${newBackup.createdAt.toLocaleDateString()} | ${newBackup.id}`
                        }]
                });
            }
            else {
                backupIDs.IDs.push({
                    value: newBackup.id,
                    name: `${guild.name} | ${newBackup.createdAt.toLocaleDateString()} | ${newBackup.id}`
                });
            }
            await int.editReply({ content: `**Respaldo creado**\nID del respaldo: \`\`${newBackup.id}\`\`` });
        });
    }
}
exports.default = CreateBackupConfirm;

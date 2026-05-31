import { onBeforeUnmount, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useActivityStore } from '../stores/activity';
import { useItemsStore } from '../stores/items';
import { useTeamsStore } from '../stores/teams';
import { getSocket, joinTeamRoom, socketState } from '../services/socket';

export function useRealtime(teamIdRef) {
  const items = useItemsStore();
  const teams = useTeamsStore();
  const activity = useActivityStore();
  const socket = getSocket();

  const handlers = {
    item_created: ({ item }) => items.upsertItem(item),
    item_updated: ({ item }) => items.upsertItem(item),
    item_deleted: ({ itemId }) => items.removeItem(itemId),
    update_posted: ({ update, itemId }) => items.upsertUpdate(itemId, update),
    comment_posted: ({ comment, itemId }) => items.upsertComment(itemId, comment),
    tag_created: ({ tag }) => teams.upsertTag(tag),
    tag_updated: ({ tag }) => teams.upsertTag(tag),
    tag_deleted: ({ tagId, teamId }) => teams.removeTag(tagId, teamId),
    member_joined: ({ member }) => teams.upsertMember(member),
    member_removed: ({ userId, teamId }) => teams.removeMember(userId, teamId),
    team_updated: ({ team }) => teams.upsertTeam(team),
    activity: ({ activity: row }) => activity.prepend(row)
  };

  Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));

  const stop = watch(
    teamIdRef,
    async (value) => {
      const teamIds = Array.isArray(value) ? value : [value];
      await Promise.all(
        teamIds
          .map((teamId) => Number(teamId))
          .filter((teamId) => Number.isInteger(teamId) && teamId > 0)
          .map((teamId) => joinTeamRoom(teamId))
      );
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    stop();
    Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
  });

  return {
    socketState,
    ...storeToRefs(items)
  };
}

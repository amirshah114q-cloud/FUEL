import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

export interface PickerOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface OptionPickerModalProps {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selectedId?: string | null;
  onSelect: (option: PickerOption | null) => void;
  onClose: () => void;
  /** Adds a top "clear selection" row, e.g. "All drivers" / "No vehicle". */
  includeClear?: boolean;
  clearLabel?: string;
  loading?: boolean;
}

export function OptionPickerModal({
  visible,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
  includeClear = false,
  clearLabel = 'All',
  loading = false
}: OptionPickerModalProps): JSX.Element {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) setSearch('');
  }, [visible]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.sublabel ?? ''}`.toLowerCase().includes(q));
  }, [options, search]);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPress} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.muted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search…"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList<PickerOption>
              data={filtered}
              keyExtractor={(o) => o.id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.emptyText}>No matches found.</Text>}
              renderItem={({ item }) => {
                const selected = item.id === selectedId;
                return (
                  <Pressable
                    style={[styles.optionRow, selected && styles.optionRowSelected]}
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                  >
                    <View style={styles.optionTexts}>
                      <Text style={styles.optionLabel}>{item.label}</Text>
                      {item.sublabel ? <Text style={styles.optionSub}>{item.sublabel}</Text> : null}
                    </View>
                    {selected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                  </Pressable>
                );
              }}
            />
          )}

          {includeClear ? (
            <Pressable
              style={styles.clearRow}
              onPress={() => {
                onSelect(null);
                onClose();
              }}
            >
              <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.clearText}>{clearLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end'
  },
  backdropPress: {
    flex: 1
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    height: '82%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    fontSize: 14,
    color: colors.text
  },
  list: {
    flexGrow: 1
  },
  listContent: {
    paddingBottom: spacing.md
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    textAlign: 'center',
    color: colors.muted,
    padding: spacing.xl,
    fontSize: 13
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: 4
  },
  optionRowSelected: {
    backgroundColor: colors.primarySoft
  },
  optionTexts: {
    flex: 1
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text
  },
  optionSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm
  },
  clearText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger
  }
});
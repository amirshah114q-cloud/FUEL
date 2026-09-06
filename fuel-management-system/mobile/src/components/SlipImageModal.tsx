import React from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

interface SlipImageModalProps {
  visible: boolean;
  uri: string;
  onClose: () => void;
}

export function SlipImageModal({ visible, uri, onClose }: SlipImageModalProps): JSX.Element {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={28} color={colors.white} />
        </Pressable>
        <Pressable style={styles.imageWrap} onPress={onClose}>
          <Image source={{ uri }} style={styles.image} resizeMode="contain" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,15,25,0.94)'
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: spacing.lg,
    zIndex: 1,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  imageWrap: {
    flex: 1,
    marginTop: 90,
    marginBottom: 30
  },
  image: {
    flex: 1
  }
});
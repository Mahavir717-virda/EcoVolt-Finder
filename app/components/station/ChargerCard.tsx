import { Badge, Button, Card } from '@/components/ui';
import { CHARGER_STATUS_CONFIG, CHARGER_TYPES, CONNECTOR_TYPES } from '@/constants/chargerTypes';
import { colors } from '@/constants/colors';
import type { Charger } from '@/types/database.types';
import { formatCurrency } from '@/utils/pricing';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ChargerCardProps {
  charger: Charger;
  onReserve?: (charger: Charger) => void;
  showActions?: boolean;
  variant?: 'default' | 'compact';
}

export function ChargerCard({
  charger,
  onReserve,
  showActions = true,
  variant = 'default',
}: ChargerCardProps) {
  const chargerType = CHARGER_TYPES[charger.charger_type];
  const connectorType = CONNECTOR_TYPES[charger.connector_type];
  const statusConfig = CHARGER_STATUS_CONFIG[charger.status];
  const isAvailable = charger.status === 'available';

  const getBadgeVariant = () => {
    switch (charger.status) {
      case 'available':
        return 'success';
      case 'in_use':
        return 'warning';
      case 'reserved':
        return 'info';
      case 'offline':
      default:
        return 'default';
    }
  };

  if (variant === 'compact') {
    return (
      <View style={styles.compactCard}>
        <View style={[styles.compactIndicator, { backgroundColor: statusConfig.color }]} />
        <View style={styles.compactContent}>
          <View style={styles.compactHeader}>
            <Text style={styles.compactType}>{chargerType.name}</Text>
            <Badge variant={getBadgeVariant()} size="sm">
              {statusConfig.label}
            </Badge>
          </View>
          <View style={styles.compactDetails}>
            <Text style={styles.compactDetail}>{connectorType.name}</Text>
            <Text style={styles.compactDot}>•</Text>
            <Text style={styles.compactDetail}>{charger.power_kw} kW</Text>
            <Text style={styles.compactDot}>•</Text>
            <Text style={styles.compactPrice}>{formatCurrency(charger.price_per_kwh)}/kWh</Text>
          </View>
        </View>
        {showActions && isAvailable && onReserve && (
          <TouchableOpacity 
            style={styles.compactReserveButton}
            onPress={() => onReserve(charger)}
          >
            <Ionicons name="add-circle" size={28} color={colors.primary[500]} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.chargerInfo}>
          <View style={[styles.iconContainer, { backgroundColor: chargerType.color + '20' }]}>
            <Ionicons name="flash" size={24} color={chargerType.color} />
          </View>
          <View style={styles.typeInfo}>
            <Text style={styles.chargerType}>{chargerType.name}</Text>
            <Text style={styles.connectorType}>{connectorType.name}</Text>
          </View>
        </View>
        <Badge variant={getBadgeVariant()}>
          {statusConfig.label}
        </Badge>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Ionicons name="speedometer-outline" size={18} color={colors.neutral[500]} />
          <View>
            <Text style={styles.detailLabel}>Power</Text>
            <Text style={styles.detailValue}>{charger.power_kw} kW</Text>
          </View>
        </View>

        <View style={styles.detailDivider} />

        <View style={styles.detailItem}>
          <Ionicons name="pricetag-outline" size={18} color={colors.neutral[500]} />
          <View>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>{formatCurrency(charger.price_per_kwh)}/kWh</Text>
          </View>
        </View>

        <View style={styles.detailDivider} />

        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={18} color={colors.neutral[500]} />
          <View>
            <Text style={styles.detailLabel}>Est. Time</Text>
            <Text style={styles.detailValue}>{getEstimatedTime(charger.power_kw)}</Text>
          </View>
        </View>
      </View>

      {/* Speed indicator */}
      <View style={styles.speedSection}>
        <Text style={styles.speedLabel}>Charging Speed</Text>
        <View style={styles.speedBar}>
          <View 
            style={[
              styles.speedFill, 
              { 
                width: `${Math.min(100, (charger.power_kw / 350) * 100)}%`,
                backgroundColor: chargerType.color,
              }
            ]} 
          />
        </View>
        <Text style={styles.speedText}>{chargerType.description}</Text>
      </View>

      {showActions && (
        <View style={styles.actions}>
          <Button
            variant={isAvailable ? 'primary' : 'ghost'}
            size="md"
            disabled={!isAvailable}
            onPress={() => onReserve?.(charger)}
            fullWidth
            title={isAvailable ? 'Reserve Now' : statusConfig.label}
          />
        </View>
      )}
    </Card>
  );
}

// Helper to estimate charging time for 80% charge
function getEstimatedTime(powerKw: number): string {
  // Assuming average EV battery is 60kWh, charging to 80% = 48kWh
  const energyNeeded = 48;
  const hours = energyNeeded / powerKw;
  
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  } else if (hours < 2) {
    const mins = Math.round((hours % 1) * 60);
    return mins > 0 ? `1h ${mins}m` : '1 hour';
  } else {
    return `${Math.round(hours)}+ hours`;
  }
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  chargerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeInfo: {
    gap: 2,
  },
  chargerType: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  connectorType: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.neutral[500],
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  detailDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.neutral[200],
  },
  speedSection: {
    marginBottom: 16,
  },
  speedLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 6,
  },
  speedBar: {
    height: 6,
    backgroundColor: colors.neutral[200],
    borderRadius: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  speedFill: {
    height: '100%',
    borderRadius: 3,
  },
  speedText: {
    fontSize: 12,
    color: colors.neutral[600],
  },
  actions: {
    marginTop: 4,
  },
  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  compactIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  compactType: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  compactDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactDetail: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  compactDot: {
    fontSize: 12,
    color: colors.neutral[400],
    marginHorizontal: 6,
  },
  compactPrice: {
    fontSize: 12,
    color: colors.primary[600],
    fontWeight: '500',
  },
  compactReserveButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default ChargerCard;

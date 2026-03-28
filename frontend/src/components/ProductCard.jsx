import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Product/Skill Card for Mosa Marketplace
 * 
 * Props:
 *  - product: { 
 *      id: string,
 *      name: string, 
 *      price: number, 
 *      description: string,
 *      image?: string,
 *      category?: 'skill' | 'product' | 'service',
 *      rating?: number,
 *      reviewCount?: number,
 *      provider?: { name: string, rating: number },
 *      duration?: string,
 *      level?: 'beginner' | 'intermediate' | 'advanced',
 *      xpReward?: number,
 *      featured?: boolean,
 *      trending?: boolean,
 *      discount?: number,
 *      tags?: string[],
 *      isAvailable?: boolean
 *    }
 *  - onPress: function to call when pressing the card
 *  - variant?: 'default' | 'compact' | 'featured'
 *  - showXP?: boolean - Show XP reward badge
 *  - onBookmark?: function - Bookmark callback
 *  - isBookmarked?: boolean - Bookmark state
 */
export default function ProductCard({ 
  product, 
  onPress, 
  variant = 'default',
  showXP = true,
  onBookmark,
  isBookmarked = false
}) {
  
  const getCategoryStyles = () => {
    const categories = {
      skill: {
        color: '#F59E0B',
        icon: 'build',
        label: 'Skill Service',
        gradient: ['#FEF3C7', '#FEF7ED']
      },
      product: {
        color: '#10B981', 
        icon: 'cube',
        label: 'Product',
        gradient: ['#D1FAE5', '#ECFDF5']
      },
      service: {
        color: '#3B82F6',
        icon: 'construct',
        label: 'Service',
        gradient: ['#DBEAFE', '#EFF6FF']
      }
    };
    return categories[product.category] || categories.skill;
  };

  const getLevelStyles = () => {
    const levels = {
      beginner: { color: '#10B981', label: 'Beginner' },
      intermediate: { color: '#F59E0B', label: 'Intermediate' },
      advanced: { color: '#EF4444', label: 'Advanced' }
    };
    return levels[product.level] || levels.beginner;
  };

  const renderCompactCard = () => (
    <TouchableOpacity
      style={[styles.card, styles.compactCard]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Image/Icon Section */}
      <View style={[styles.imageContainer, styles.compactImage]}>
        {product.image ? (
          <Image 
            source={{ uri: product.image }} 
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.iconContainer, { backgroundColor: getCategoryStyles().color }]}>
            <Ionicons name={getCategoryStyles().icon} size={20} color="#FFFFFF" />
          </View>
        )}
      </View>

      {/* Content Section */}
      <View style={styles.compactContent}>
        <Text style={styles.compactTitle} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.compactDescription} numberOfLines={2}>
          {product.description}
        </Text>
        <View style={styles.compactFooter}>
          <Text style={styles.compactPrice}>{product.price} ETB</Text>
          {product.rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingText}>{product.rating}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDefaultCard = () => (
    <TouchableOpacity
      style={[styles.card, styles.defaultCard]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header with Category and Bookmark */}
      <View style={styles.header}>
        <View style={[styles.categoryTag, { backgroundColor: getCategoryStyles().color }]}>
          <Ionicons name={getCategoryStyles().icon} size={12} color="#FFFFFF" />
          <Text style={styles.categoryText}>{getCategoryStyles().label}</Text>
        </View>
        
        <View style={styles.headerActions}>
          {product.featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="flash" size={12} color="#FFFFFF" />
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}
          
          {onBookmark && (
            <TouchableOpacity 
              style={styles.bookmarkButton}
              onPress={(e) => {
                e.stopPropagation();
                onBookmark();
              }}
            >
              <Ionicons 
                name={isBookmarked ? "bookmark" : "bookmark-outline"} 
                size={20} 
                color={isBookmarked ? "#D4A017" : "#6B7280"} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Image Section */}
      <View style={styles.imageContainer}>
        {product.image ? (
          <Image 
            source={{ uri: product.image }} 
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: getCategoryStyles().gradient[0] }]}>
            <Ionicons name={getCategoryStyles().icon} size={32} color={getCategoryStyles().color} />
          </View>
        )}
        
        {/* XP Reward Badge */}
        {showXP && product.xpReward && (
          <View style={styles.xpBadge}>
            <Ionicons name="star" size={12} color="#FFFFFF" />
            <Text style={styles.xpText}>+{product.xpReward} XP</Text>
          </View>
        )}

        {/* Discount Badge */}
        {product.discount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{product.discount}%</Text>
          </View>
        )}
      </View>

      {/* Content Section */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {product.description}
        </Text>

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {product.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {product.tags.length > 3 && (
              <Text style={styles.moreTags}>+{product.tags.length - 3}</Text>
            )}
          </View>
        )}

        {/* Provider & Rating */}
        {(product.provider || product.rating) && (
          <View style={styles.metaContainer}>
            {product.provider && (
              <View style={styles.providerContainer}>
                <Ionicons name="person-circle" size={16} color="#6B7280" />
                <Text style={styles.providerText}>{product.provider.name}</Text>
                {product.provider.rating && (
                  <View style={styles.providerRating}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.providerRatingText}>{product.provider.rating}</Text>
                  </View>
                )}
              </View>
            )}
            
            {product.rating && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.ratingText}>{product.rating}</Text>
                {product.reviewCount && (
                  <Text style={styles.reviewCount}>({product.reviewCount})</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Footer with Price and Actions */}
        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{product.price} ETB</Text>
            {product.duration && (
              <Text style={styles.duration}> • {product.duration}</Text>
            )}
          </View>
          
          {product.level && (
            <View style={[styles.levelBadge, { backgroundColor: getLevelStyles().color }]}>
              <Text style={styles.levelText}>{getLevelStyles().label}</Text>
            </View>
          )}
        </View>

        {/* Availability Indicator */}
        {product.isAvailable === false && (
          <View style={styles.unavailableOverlay}>
            <Text style={styles.unavailableText}>Currently Unavailable</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFeaturedCard = () => (
    <TouchableOpacity
      style={[styles.card, styles.featuredCard]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.featuredGradient, { backgroundColor: getCategoryStyles().gradient[0] }]}>
        {/* Featured Header */}
        <View style={styles.featuredHeader}>
          <View style={styles.featuredLabel}>
            <Ionicons name="flash" size={16} color="#FFFFFF" />
            <Text style={styles.featuredLabelText}>FEATURED</Text>
          </View>
          {product.trending && (
            <View style={styles.trendingBadge}>
              <Ionicons name="trending-up" size={12} color="#FFFFFF" />
              <Text style={styles.trendingText}>Trending</Text>
            </View>
          )}
        </View>

        {/* Featured Content */}
        <View style={styles.featuredContent}>
          <View style={styles.featuredTextContainer}>
            <Text style={styles.featuredTitle} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={styles.featuredDescription} numberOfLines={3}>
              {product.description}
            </Text>
            <View style={styles.featuredPriceContainer}>
              <Text style={styles.featuredPrice}>{product.price} ETB</Text>
              {product.xpReward && (
                <View style={styles.featuredXp}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.featuredXpText}>+{product.xpReward} XP</Text>
                </View>
              )}
            </View>
          </View>

          {/* Featured Image */}
          <View style={styles.featuredImageContainer}>
            {product.image ? (
              <Image 
                source={{ uri: product.image }} 
                style={styles.featuredImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.featuredPlaceholder}>
                <Ionicons name={getCategoryStyles().icon} size={32} color={getCategoryStyles().color} />
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render based on variant
  if (variant === 'compact') {
    return renderCompactCard();
  }
  
  if (variant === 'featured') {
    return renderFeaturedCard();
  }
  
  return renderDefaultCard();
}

// Specialized Mosa Product Cards
export function SkillCard(props) {
  return <ProductCard {...props} />;
}

export function ServiceCard(props) {
  return <ProductCard {...props} />;
}

export function ProductItemCard(props) {
  return <ProductCard {...props} />;
}

const styles = StyleSheet.create({
  // Base Card Styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  
  // Default Card Variant
  defaultCard: {
    // Uses base card styles
  },
  
  // Compact Card Variant
  compactCard: {
    flexDirection: 'row',
    padding: 12,
  },
  compactImage: {
    width: 60,
    height: 60,
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 4,
  },
  compactDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  compactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D4A017',
  },
  
  // Featured Card Variant
  featuredCard: {
    // Special styling for featured items
  },
  featuredGradient: {
    padding: 16,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  featuredLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4A017',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredLabelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  trendingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  featuredContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featuredTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 6,
  },
  featuredDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  featuredPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D4A017',
    marginRight: 12,
  },
  featuredXp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredXpText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginLeft: 4,
  },
  featuredImageContainer: {
    width: 80,
    height: 80,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  featuredPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Common Elements
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4A017',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
  },
  featuredText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  bookmarkButton: {
    padding: 4,
  },
  
  // Image Section
  imageContainer: {
    position: 'relative',
    height: 160,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Badges
  xpBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  xpText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Content Section
  content: {
    padding: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  
  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#6B7280',
  },
  moreTags: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  
  // Meta Information
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
    marginRight: 8,
  },
  providerRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerRatingText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D5016',
    marginLeft: 4,
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D4A017',
  },
  duration: {
    fontSize: 14,
    color: '#6B7280',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Unavailable Overlay
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  unavailableText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Animated,
    Dimensions,
    Image,
    ImageBackground,
    Linking,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Barber, getBarbers, getStorageImages } from '../../services/firebase';
import TopNav from '../components/TopNav';

const { width, height } = Dimensions.get('window');

interface TeamScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  onBack?: () => void;
}

const TeamScreen: React.FC<TeamScreenProps> = ({ onNavigate, onBack }) => {
  const { t } = useTranslation();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsBarber, setDetailsBarber] = useState<Barber | null>(null);
  const [flippedCards, setFlippedCards] = useState<{[key: string]: Animated.Value}>({});
  const [teamImages, setTeamImages] = useState<string[]>([]);

  useEffect(() => {
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    try {
      const [barbersData, imagesData] = await Promise.all([
        getBarbers(),
        getStorageImages('ourteam')
      ]);
      
      // Sort barbers: main barber (רן) first, then others
      const sortedBarbers = barbersData.sort((a, b) => {
        if ((a as any).isMainBarber) return -1;
        if ((b as any).isMainBarber) return 1;
        if (a.name === 'רן אגלריסי') return -1;
        if (b.name === 'רן אגלריסי') return 1;
        return a.name.localeCompare(b.name);
      });
      
      // Force assign images from storage to barbers
      console.log('🔍 Available images from storage:', imagesData);
      console.log('🔍 Barbers before image assignment:', sortedBarbers);
      
      const updatedBarbers = sortedBarbers.map(barber => {
        console.log(`🔍 Processing barber: ${barber.name}, current image:`, (barber as any).image);
        
        // Always try to find a better image from storage
        if (imagesData.length > 0) {
          // Try to find image by name match
          const nameMatch = imagesData.find(img => {
            const imgLower = img.toLowerCase();
            const nameLower = barber.name.toLowerCase().replace(/\s+/g, '');
            const nameWithUnderscore = barber.name.toLowerCase().replace(/\s+/g, '_');
            
            // Check for exact name match (with or without underscore)
            const hasNameMatch = imgLower.includes(nameLower) || imgLower.includes(nameWithUnderscore);
            
            // Special case for Naama Bloom
            const hasNaamaMatch = imgLower.includes('naama') && barber.name.toLowerCase().includes('נעמה');
            
            // Check if image starts with the name (since format is "Name_timestamp.jpg")
            const hasPrefixMatch = imgLower.startsWith(nameLower) || imgLower.startsWith(nameWithUnderscore);
            
            console.log(`🔍 Checking image: ${img}`);
            console.log(`🔍 Name: ${nameLower}, Underscore: ${nameWithUnderscore}`);
            console.log(`🔍 Name match: ${hasNameMatch}, Naama match: ${hasNaamaMatch}, Prefix match: ${hasPrefixMatch}`);
            
            return hasNameMatch || hasNaamaMatch || hasPrefixMatch;
          });
          
          if (nameMatch) {
            console.log(`✅ Found image for ${barber.name}:`, nameMatch);
            return { ...barber, image: nameMatch };
          } else {
            console.log(`❌ No image found for ${barber.name}, using first available image`);
            // If no specific match, use the first available image
            return { ...barber, image: imagesData[0] };
          }
        }
        return barber;
      });
      
      console.log('🔍 Final barbers with images:', updatedBarbers);
      
      setBarbers(updatedBarbers);
      setTeamImages(imagesData);
      
      // Initialize animation values for each barber
      const animatedValues: {[key: string]: Animated.Value} = {};
      updatedBarbers.forEach(barber => {
        animatedValues[barber.id] = new Animated.Value(0);
      });
      setFlippedCards(animatedValues);
    } catch (error) {
      console.error('Error loading barbers:', error);
      Alert.alert(t('common.error'), t('team.load_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleBarberPress = (barber: Barber) => {
    const animatedValue = flippedCards[barber.id];
    if (animatedValue) {
      Animated.timing(animatedValue, {
        toValue: (animatedValue as any)._value === 0 ? 1 : 0,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleBookWithBarber = () => {
    if (selectedBarber) {
      setModalVisible(false);
      onNavigate('booking', { barberId: selectedBarber.id });
    }
  };

  const handleWhatsAppPress = (barber: Barber) => {
    // Use whatsapp field first, fallback to phone
    const whatsappNumber = (barber as any).whatsapp || barber.phone;
    
    if (whatsappNumber) {
      const message = t('team.whatsapp_message', { name: barber.name });
      
      // Normalize phone number to E.164 format
      let normalizedNumber = whatsappNumber;
      
      // Remove any non-digit characters
      normalizedNumber = normalizedNumber.replace(/\D/g, '');
      
      // Add country code if not present
      if (normalizedNumber.startsWith('05')) {
        normalizedNumber = '972' + normalizedNumber.substring(1);
      } else if (normalizedNumber.startsWith('5')) {
        normalizedNumber = '972' + normalizedNumber;
      } else if (!normalizedNumber.startsWith('972')) {
        normalizedNumber = '972' + normalizedNumber;
      }
      
      const url = `whatsapp://send?phone=${normalizedNumber}&text=${encodeURIComponent(message)}`;
      
      console.log(`🟢 Opening WhatsApp for ${barber.name}: ${normalizedNumber}`);
      
      Linking.openURL(url).catch(() => {
        // Fallback to web WhatsApp
        const webUrl = `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
        Linking.openURL(webUrl).catch(() => {
          Alert.alert(t('common.error'), t('team.whatsapp_error'));
        });
      });
    } else {
      Alert.alert(t('common.error'), 'מספר WhatsApp לא זמין לספר זה');
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={[styles.star, i <= rating ? styles.starFilled : styles.starEmpty]}>
          ★
        </Text>
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopNav 
          title={t('team.title')} 
          onBellPress={() => {}} 
          onMenuPress={() => {}}
          showBackButton={true}
          onBackPress={onBack || (() => onNavigate('home'))}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title={t('team.title')} 
        onBellPress={() => {}} 
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate('home'))}
      />
      
      {/* Hero Section with Ran's Background */}
      <View style={styles.heroSection}>
        <ImageBackground
          source={require('../../assets/images/ourteam.png')}
          style={styles.heroImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.85)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.heroOverlay}
          />
          {/* Seamless blending effect */}
          <LinearGradient
            colors={[
              'transparent', 
              'rgba(255,255,255,0.02)', 
              'rgba(255,255,255,0.05)', 
              'rgba(255,255,255,0.1)', 
              'rgba(255,255,255,0.2)', 
              'rgba(255,255,255,0.35)', 
              'rgba(255,255,255,0.5)', 
              'rgba(255,255,255,0.7)', 
              'rgba(255,255,255,0.9)'
            ]}
            start={{ x: 0, y: 0.3 }}
            end={{ x: 0, y: 1 }}
            style={styles.glossyEffect}
          />
          {/* Additional subtle layer for perfect blending */}
          <LinearGradient
            colors={[
              'transparent', 
              'rgba(255,255,255,0.01)', 
              'rgba(255,255,255,0.03)', 
              'rgba(255,255,255,0.08)', 
              'rgba(255,255,255,0.15)'
            ]}
            start={{ x: 0, y: 0.6 }}
            end={{ x: 0, y: 1 }}
            style={styles.blurLayer}
          />
          {/* Logo at the top */}
          <View style={styles.heroLogoContainer}>
            <Image
              source={require('../../assets/images/icon.booking.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>כאן כדי לתת לך את השירות הטוב ביותר!</Text>
            </View>
          </View>
        </ImageBackground>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>הצוות שלנו</Text>
          
          {barbers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{t('team.no_barbers')}</Text>
            </View>
          ) : (
            <View style={styles.barbersGrid}>
              {barbers.map((barber, index) => {
                const animatedValue = flippedCards[barber.id];
                const frontRotation = animatedValue?.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg']
                });
                const backRotation = animatedValue?.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['180deg', '360deg']
                });

                return (
                  <TouchableOpacity 
                    key={barber.id} 
                    style={styles.cardContainer}
                    onPress={() => handleBarberPress(barber)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.flipCard}>
                      {/* Front of card */}
                      <Animated.View style={[
                        styles.cardFace, 
                        styles.cardFront,
                        { transform: [{ rotateY: frontRotation || '0deg' }] }
                      ]}>
                        <View style={styles.barberImageContainer}>
                          {(() => {
                            console.log(`🖼️ Rendering image for ${barber.name}:`, (barber as any).image);
                            return (barber as any).image ? (
                            <View style={styles.barberPhotoContainer}>
                              <Image
                                source={{ uri: (barber as any).image }}
                                style={styles.barberPhoto}
                                resizeMode="cover"
                                onLoad={() => console.log(`✅ Image loaded successfully for ${barber.name}`)}
                                onError={(error) => {
                                  console.log(`❌ Image load error for ${barber.name}:`, error);
                                  console.log(`❌ Failed URL:`, (barber as any).image);
                                }}
                                onLoadStart={() => console.log(`🔄 Starting to load image for ${barber.name}`)}
                                onLoadEnd={() => console.log(`🏁 Image load ended for ${barber.name}`)}
                              />
                              <View style={styles.barberPhotoFallback}>
                                <Ionicons name="person" size={30} color="#999" />
                              </View>
                            </View>
                          ) : (
                            <View style={styles.barberPhotoPlaceholder}>
                              <Ionicons name="person-outline" size={40} color="#666" />
                              <Text style={{fontSize: 10, color: '#999', marginTop: 4}}>No image</Text>
                            </View>
                          );
                          })()}
                        </View>
                        <View style={styles.barberBasicInfo}>
                          <Text style={styles.barberName}>{barber.name}</Text>
                          <Text style={styles.barberTitle}>{t('team.professional_artist')}</Text>
                          <View style={styles.ratingContainer}>
                            <View style={styles.stars}>
                              {renderStars(barber.rating)}
                            </View>
                            <Text style={styles.ratingText}>({barber.rating})</Text>
                          </View>
                        </View>
                      </Animated.View>

                      {/* Back of card */}
                      <Animated.View style={[
                        styles.cardFace, 
                        styles.cardBack,
                        { transform: [{ rotateY: backRotation || '180deg' }] }
                      ]}>
                        <View style={styles.barberDetails}>
                          <Text style={styles.detailsTitle}>{t('team.additional_details')}</Text>
                          <Text style={styles.barberExperience}>{barber.experience}</Text>
                          
                          <View style={styles.specialtiesContainer}>
                            {barber.specialties && barber.specialties.slice(0, 2).map((specialty, idx) => (
                              <View key={idx} style={styles.specialtyTag}>
                                <Text style={styles.specialtyText}>{specialty}</Text>
                              </View>
                            ))}
                          </View>

                          <View style={styles.barberActions}>
                            <TouchableOpacity 
                              style={styles.bookingButton} 
                              onPress={(e) => {
                                e.stopPropagation();
                                setSelectedBarber(barber);
                                setModalVisible(true);
                              }}
                            >
                              <LinearGradient
                                colors={['#FF00AA', '#1d4ed8']}
                                style={styles.buttonGradient}
                              >
                                <Ionicons name="calendar" size={14} color="#fff" />
                                <Text style={styles.bookingButtonText}>{t('team.book_appointment')}</Text>
                              </LinearGradient>
                            </TouchableOpacity>
                            
                            {barber.phone && (
                              <TouchableOpacity 
                                style={styles.whatsappButton} 
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleWhatsAppPress(barber);
                                }}
                              >
                                <LinearGradient
                                  colors={['#25D366', '#128C7E']}
                                  style={styles.buttonGradient}
                                >
                                  <Ionicons name="logo-whatsapp" size={14} color="#fff" />
                                  <Text style={styles.whatsappButtonText}>{t('team.whatsapp')}</Text>
                                </LinearGradient>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </Animated.View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Barber Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBarber && (
              <>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
                
                <View style={styles.modalHeader}>
                  <View style={styles.modalBarberImage}>
                    {selectedBarber.image ? (
                      <Image
                        source={{ uri: selectedBarber.image }}
                        style={styles.barberPhoto}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.modalBarberPlaceholder}>✂️</Text>
                    )}
                  </View>
                  <Text style={styles.modalBarberName}>{selectedBarber.name}</Text>
                  <Text style={styles.modalBarberExperience}>{selectedBarber.experience}</Text>
                </View>

                <View style={styles.modalRating}>
                  <View style={styles.stars}>
                    {renderStars(selectedBarber.rating)}
                  </View>
                  <Text style={styles.ratingText}>{selectedBarber.rating}/5</Text>
                </View>

                <View style={styles.modalSpecialties}>
                  <Text style={styles.modalSpecialtiesTitle}>{t('team.specialties')}:</Text>
                  <View style={styles.specialtiesGrid}>
                    {(selectedBarber.specialties || []).map((specialty, index) => (
                      <View key={index} style={styles.modalSpecialtyTag}>
                        <Text style={styles.modalSpecialtyText}>{specialty}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.bookButton}
                    onPress={handleBookWithBarber}
                  >
                    <Text style={styles.bookButtonText}>
                      {t('team.book_appointment')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Details Barber Modal */}
      <Modal
        visible={!!detailsBarber}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsBarber(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: 320, alignItems: 'center' }}>
            {detailsBarber?.image && (
              <Image source={{ uri: detailsBarber.image }} style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 12 }} />
            )}
            <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 6 }}>{detailsBarber?.name}</Text>
            <Text style={{ fontSize: 16, color: '#666', marginBottom: 8 }}>{detailsBarber?.experience}</Text>
            {detailsBarber?.phone && (
              <Text style={{ fontSize: 16, color: '#FF00AA', marginBottom: 8 }}>{t('profile.phone')}: {detailsBarber.phone}</Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              {/* אייקון וואטסאפ */}
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                <Text style={{ color: '#fff', fontSize: 20 }}>🟢</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setDetailsBarber(null)} style={{ marginTop: 18 }}>
              <Text style={{ color: '#FF00AA', fontWeight: 'bold' }}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  heroSection: {
    height: height * 0.35,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  glossyEffect: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  blurLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  heroLogoContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  heroLogo: {
    width: 80,
    height: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  heroTextContainer: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 24,
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  barbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  cardContainer: {
    width: (width - 60) / 2,
    height: 200,
    marginBottom: 20,
  },
  flipCard: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    alignItems: 'center',
    padding: 16,
  },
  cardBack: {
    padding: 16,
    justifyContent: 'space-between',
  },
  barberImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barberPhotoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    position: 'relative',
  },
  barberPhoto: {
    width: '100%',
    height: '100%',
  },
  barberPhotoFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  barberPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  barberBasicInfo: {
    alignItems: 'center',
    flex: 1,
  },
  barberDetails: {
    flex: 1,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  barberInfo: {
    padding: 24,
    position: 'relative',
    zIndex: 2,
  },
  barberHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  barberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
    textAlign: 'center',
  },
  barberTitle: {
    fontSize: 12,
    color: '#FF00AA',
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  barberExperience: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 4,
  },
  star: {
    fontSize: 12,
    marginHorizontal: 1,
  },
  starFilled: {
    color: '#FFD700',
  },
  starEmpty: {
    color: '#ddd',
  },
  ratingText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 12,
  },
  specialtyTag: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginHorizontal: 2,
    marginBottom: 4,
  },
  specialtyText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '500',
  },
  barberActions: {
    flexDirection: 'column',
    gap: 6,
  },
  bookingButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  whatsappButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  bookingButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  whatsappButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: width * 0.9,
    maxHeight: height * 0.8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  modalBarberImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  modalBarberPlaceholder: {
    fontSize: 50,
    color: '#666',
  },
  modalBarberName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalBarberExperience: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalRating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  modalSpecialties: {
    marginBottom: 24,
  },
  modalSpecialtiesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
    textAlign: 'right',
  },
  specialtiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  modalSpecialtyTag: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
    marginBottom: 8,
  },
  modalSpecialtyText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  modalActions: {
    marginTop: 16,
  },
  bookButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default TeamScreen;
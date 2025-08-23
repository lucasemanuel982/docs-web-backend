// Constantes de validação de imagem
export const IMAGE_VALIDATION = {
  MAX_SIZE_BYTES: 1024 * 1024, // 1MB
  MAX_DIMENSIONS: { width: 1024, height: 1024 }, // Máximo 1024x1024px
  VALID_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  VALID_MIME_TYPES: ['data:image/jpeg;base64,', 'data:image/jpg;base64,', 'data:image/png;base64,', 'data:image/gif;base64,', 'data:image/webp;base64,']
};

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  size?: number;
  dimensions?: { width: number; height: number };
}

/**
 * Valida uma imagem em base64
 */
export function validateBase64Image(base64String: string): ImageValidationResult {
  try {
    // Verificar se é uma string válida
    if (!base64String || typeof base64String !== 'string') {
      return { isValid: false, error: 'Imagem inválida' };
    }

    // Verificar se começa com um tipo MIME válido
    const isValidMimeType = IMAGE_VALIDATION.VALID_MIME_TYPES.some(mimeType => 
      base64String.startsWith(mimeType)
    );

    if (!isValidMimeType) {
      return { isValid: false, error: 'Formato de imagem não suportado. Use JPEG, PNG, GIF ou WebP' };
    }

    // Remover o prefixo data:image/...;base64, para obter apenas os dados
    const base64Data = base64String.split(',')[1];
    if (!base64Data) {
      return { isValid: false, error: 'Formato base64 inválido' };
    }

    // Calcular tamanho em bytes
    const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
    
    // Verificar tamanho
    if (sizeInBytes > IMAGE_VALIDATION.MAX_SIZE_BYTES) {
      return { 
        isValid: false, 
        error: `Imagem muito grande. Máximo permitido: ${formatBytes(IMAGE_VALIDATION.MAX_SIZE_BYTES)}`,
        size: sizeInBytes
      };
    }

    // Para validação de dimensões, seria necessário decodificar a imagem
    // Por simplicidade, vamos apenas validar o tamanho por enquanto
    // Em uma implementação mais robusta, você poderia usar uma biblioteca como 'sharp' ou 'jimp'

    return { 
      isValid: true, 
      size: sizeInBytes
    };

  } catch (error) {
    return { isValid: false, error: 'Erro ao validar imagem' };
  }
}

/**
 * Formata bytes em uma string legível
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Valida se uma string é um base64 válido
 */
export function isValidBase64(str: string): boolean {
  try {
    // Verificar se é uma string válida
    if (typeof str !== 'string') return false;
    
    // Verificar se contém apenas caracteres válidos de base64
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    const base64Data = str.split(',')[1] || str;
    
    return base64Regex.test(base64Data);
  } catch {
    return false;
  }
} 
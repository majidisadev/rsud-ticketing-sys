const generateTicketNumber = () => {
  // Pool karakter: angka 0-9 dan huruf lowercase a-z
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let ticketNumber = '';
  
  // Generate 8 karakter random
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    ticketNumber += chars[randomIndex];
  }
  
  return ticketNumber;
};

module.exports = { generateTicketNumber };


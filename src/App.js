import logo from './logo.svg';
import './App.css';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  IconButton,
  ButtonGroup,
  Chip,
  Icon,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link
} from '@mui/material';

// Importing Material-UI Icons
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ListIcon from '@mui/icons-material/List';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

function App() {
  const [bookings, setBookings] = useState([]);
  const [venues, setVenues] = useState([]);
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [courtNumber, setCourtNumber] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [bookedBy, setBookedBy] = useState('');
  const [message, setMessage] = useState('');
  const [activeView, setActiveView] = useState('all');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [availability, setAvailability] = useState({
    maxCourts: 0,
    bookedCourts: 0,
    availableCourts: 0,
  });
  const [occupiedCourts, setOccupiedCourts] = useState([]);

  const API_BASE_URL = 'http://localhost:8080/api';

  // State to hold a loading status for fetching data
  const [bookingsLoading, setBookingsLoading] = useState(true);

  // Function to show a custom dialog instead of alert() or confirm()
  const showDialog = (msg) => {
    setDialogMessage(msg);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  // Memoized function to fetch bookings to prevent re-creation on every render
  const fetchBookings = useCallback(async () => {
    console.log("Fetched bookings");
    setBookingsLoading(true);
    try {
      let url = `${API_BASE_URL}/bookings`;

      // Fetch bookings based on the active view
      if (activeView === 'active') {
        url = `${API_BASE_URL}/bookings/active`;
      } else if (activeView === 'expired') {
        url = `${API_BASE_URL}/bookings/expired`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setMessage(`Error fetching bookings: ${error.message}`);
    } finally {
      setBookingsLoading(false);
    }
  }, [activeView]);

  // Effect to fetch bookings whenever the active view changes
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Effect to fetch venues on initial component mount
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/venues`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setVenues(data);
        if (data.length > 0) {
          // Select the first venue by default
          setSelectedVenueId(data[0]._id);
          setSelectedVenue(data[0]);
        }
      } catch (error) {
        console.error('Error fetching venues:', error);
        setMessage(`Error fetching venues: ${error.message}`);
      }
    };
    fetchVenues();
  }, []);

  // Effect to fetch availability whenever selected venue or time slot changes
  useEffect(() => {
    const fetchAvailability = async () => {
      if (selectedVenueId && startTime && endTime) {
        try {
          const url = `${API_BASE_URL}/venues/${selectedVenueId}/availability?startTime=${startTime}Z&endTime=${endTime}Z`;
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setAvailability(data);
        } catch (error) {
          console.error('Error fetching availability:', error);
          setMessage(`Error fetching availability: ${error.message}`);
          setAvailability({
            maxCourts: selectedVenue.maxCourts,
            bookedCourts: 0,
            availableCourts: 0,
          });
        }
      } else if (selectedVenue) {
        // If no time is selected, reset availability to show all courts are potentially available
        setAvailability({
          maxCourts: selectedVenue.maxCourts,
          bookedCourts: 0,
          availableCourts: selectedVenue.maxCourts,
        });
      }
    };
    fetchAvailability();
  }, [selectedVenueId, startTime, endTime, selectedVenue]);

  // Function to check for time overlaps
  const isTimeOverlap = (start1, end1, start2, end2) => {
    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);
    return s1 < e2 && s2 < e1;
  };

  // Logic to determine available courts
  const availableCourts = () => {
    if (!startTime || !endTime) {
      return [];
    }
    const courts = Array.from({ length: selectedVenue.maxCourts }, (_, i) => `Court ${i + 1}`);

    // Filter out courts that have an overlapping active booking
    const occupiedCourts = bookings
      .filter(booking => new Date(booking.endTime) > new Date()) // only consider active bookings
      .filter(booking => isTimeOverlap(startTime, endTime, booking.startTime, booking.endTime))
      .map(booking => booking.courtNumber);

    console.log("occupiedCourts:", occupiedCourts);

    return courts.filter(court => !occupiedCourts.includes(court));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedVenueId || !courtNumber || !startTime || !endTime || !bookedBy) {
      setMessage('Please fill in all fields.');
      return;
    }

    // Check for availability before submission
    if (!availableCourts().includes(courtNumber)) {
      setMessage(`Error: Court ${courtNumber} is not available at the selected time.`);
      return;
    }

    setLoading(true);

    const newBooking = {
      venueId: selectedVenueId,
      courtNumber,
      startTime,
      endTime,
      bookedBy,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': '*'
        },
        body: JSON.stringify(newBooking),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setCourtNumber('');
        setStartTime('');
        setEndTime('');
        setBookedBy('');
        // After successful booking, refresh the list
        fetchBookings();
      } else {
        setMessage(`Error: ${data.message || 'Failed to book court.'}`);
      }
    } catch (error) {
      console.error('Error booking court:', error);
      setMessage(`Server error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    // Custom confirmation dialog
    if (!window.confirm('Are you sure you want to delete this booking?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        // Optimistically remove the booking from the state
        setBookings(bookings.filter(booking => booking._id !== id));
        // Refresh the list to get the most up-to-date data
        fetchBookings();
      } else {
        setMessage(`Error: ${data.message || 'Failed to delete booking.'}`);
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      setMessage(`Server error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const isTimeSelected = startTime && endTime;

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#f5f5f5',
      py: 6,
      fontFamily: 'Inter, sans-serif'
    }}>
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{
          p: { xs: 2, md: 4 },
          borderRadius: 4,
          boxShadow: 24,
        }}>
          <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 4 }}>
            Badminton Court Booking
          </Typography>

          {message && (
            <Alert
              severity={message.includes('Error') ? 'error' : 'success'}
              sx={{ mb: 4 }}
            >
              {message}
            </Alert>
          )}

          {/* Court Availability Section */}
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 4, bgcolor: '#e3f2fd', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <SportsTennisIcon color="primary" sx={{ mr: 1, fontSize: 30 }} />
              <Typography variant="h6" color="primary.dark">
                {selectedVenue ? `${selectedVenue.name} Courts` : 'Select a Venue'}
              </Typography>
            </Box>
            {selectedVenue && (
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  Total Courts: {availability.maxCourts}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                  Booked for Selected Slot: {availability.bookedCourts}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                  Available for Selected Slot: {availability.availableCourts}
                </Typography>
              </Box>
            )}
          </Paper>

          <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mb: 4 }}>
            Expired bookings automatically become available for new reservations.
          </Alert>

          {/* Booking Form Section */}
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 }, mb: 4, bgcolor: '#f3f6f9', borderRadius: 2 }}>
            <Typography variant="h5" component="h2" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
              <AddCircleOutlineIcon sx={{ mr: 1 }} /> Book a New Court
            </Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel id="venue-select-label">Venue</InputLabel>
                    <Select
                      labelId="venue-select-label"
                      value={selectedVenueId}
                      label="Venue"
                      onChange={(e) => {
                        const venueId = e.target.value;
                        const venue = venues.find(v => v._id === venueId);
                        setSelectedVenueId(venueId);
                        setSelectedVenue(venue);
                        setCourtNumber(''); // Reset court number on venue change
                      }}
                    >
                      {venues.map((venue) => (
                        <MenuItem key={venue._id} value={venue._id}>
                          {venue.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Booked By"
                    variant="outlined"
                    value={bookedBy}
                    onChange={(e) => setBookedBy(e.target.value)}
                    placeholder="Your Name"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Start Time"
                    type="datetime-local"
                    InputLabelProps={{ shrink: true }}
                    variant="outlined"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="End Time"
                    type="datetime-local"
                    InputLabelProps={{ shrink: true }}
                    variant="outlined"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={!selectedVenue || !isTimeSelected || availability.availableCourts === 0}>
                    <InputLabel id="court-number-label">Court Number</InputLabel>
                    <Select
                      labelId="court-number-label"
                      value={courtNumber}
                      label="Court Number"
                      onChange={(e) => setCourtNumber(e.target.value)}
                      required
                    >
                      {selectedVenue && availability.availableCourts > 0 ? (
                        availableCourts().map((court) => (
                          <MenuItem key={court} value={court} disabled={false}>
                            {court}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>No courts available for this time.</MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    sx={{ mt: 2 }}
                    disabled={loading || availability.availableCourts === 0}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Book Court'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* Bookings List Section */}
          <Box>
            <Typography variant="h5" component="h2" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
              <ListIcon sx={{ mr: 1 }} /> All Bookings
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
              <ButtonGroup variant="contained" aria-label="outlined primary button group">
                <Button
                  onClick={() => setActiveView('all')}
                  color={activeView === 'all' ? 'primary' : 'inherit'}
                >
                  All
                </Button>
                <Button
                  onClick={() => setActiveView('active')}
                  color={activeView === 'active' ? 'success' : 'inherit'}
                >
                  Active
                </Button>
                <Button
                  onClick={() => setActiveView('expired')}
                  color={activeView === 'expired' ? 'error' : 'inherit'}
                >
                  Expired
                </Button>
              </ButtonGroup>
            </Box>

            {bookingsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
              </Box>
            ) : bookings.length === 0 ? (
              <Typography variant="body1" align="center" color="text.secondary" sx={{ mt: 4 }}>
                No bookings found for this view.
              </Typography>
            ) : (
              <Grid container spacing={3}>
                {bookings.map((booking) => (
                  <Grid item xs={12} sm={6} md={4} key={booking._id}>
                    <Card variant="outlined" sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <CardContent>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                          {booking.courtNumber}
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <SportsTennisIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              <Box component="span" sx={{ fontWeight: 'bold' }}>Venue:</Box> {booking.venue?.name || 'N/A'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Icon component={CalendarMonthIcon} sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              <Box component="span" sx={{ fontWeight: 'bold' }}>Start:</Box> {formatDateTime(booking.startTime)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Icon component={AccessTimeIcon} sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              <Box component="span" sx={{ fontWeight: 'bold' }}>End:</Box> {formatDateTime(booking.endTime)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Icon component={PersonIcon} sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              <Box component="span" sx={{ fontWeight: 'bold' }}>Booked By:</Box> {booking.bookedBy}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pt: 0 }}>
                        {new Date(booking.endTime) < new Date() ? (
                          <Chip label="Expired" icon={<CancelIcon />} color="error" />
                        ) : (
                          <Chip label="Active" icon={<CheckCircleIcon />} color="success" />
                        )}
                        <IconButton
                          aria-label="delete"
                          onClick={() => handleDelete(booking._id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Paper>
      </Container>

      {/* Custom Dialog for confirmation/messages */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Message"}</DialogTitle>
        <DialogContent>
          <Typography id="alert-dialog-description" sx={{ mt: 2 }}>
            {dialogMessage}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default App;


// import React, { useState, useEffect } from 'react';
// import {
//   Container,
//   Typography,
//   Box,
//   Paper,
//   Grid,
//   TextField,
//   Button,
//   Alert,
//   Card,
//   CardContent,
//   IconButton,
//   ButtonGroup,
//   Chip,
//   Icon,
//   FormControl,
//   InputLabel,
//   Select,
//   MenuItem
// } from '@mui/material';

// // Importing Material-UI Icons
// import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
// import AccessTimeIcon from '@mui/icons-material/AccessTime';
// import PersonIcon from '@mui/icons-material/Person';
// import DeleteIcon from '@mui/icons-material/Delete';
// import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
// import ListIcon from '@mui/icons-material/List';
// import CheckCircleIcon from '@mui/icons-material/CheckCircle';
// import CancelIcon from '@mui/icons-material/Cancel';
// import SportsTennisIcon from '@mui/icons-material/SportsTennis';
// import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

// // Define the total number of courts available
// const TOTAL_COURTS_COUNT = 5;

// function App() {
//   const [bookings, setBookings] = useState([]);
//   const [courtNumber, setCourtNumber] = useState('');
//   const [startTime, setStartTime] = useState('');
//   const [endTime, setEndTime] = useState('');
//   const [bookedBy, setBookedBy] = useState('');
//   const [message, setMessage] = useState('');
//   const [activeView, setActiveView] = useState('all');

//   const API_BASE_URL = 'http://localhost:8080/api/bookings';

//   const [activeBookingsCount, setActiveBookingsCount] = useState(0);

//   useEffect(() => {
//     const fetchBookings = async () => {
//       try {
//         let url = API_BASE_URL;

//         // Fetch all bookings first to determine active count regardless of current view
//         const allBookingsResponse = await fetch(API_BASE_URL);
//         if (!allBookingsResponse.ok) {
//           throw new Error(`HTTP error! status: ${allBookingsResponse.status}`);
//         }
//         const allBookingsData = await allBookingsResponse.json();

//         const now = new Date();
//         const active = allBookingsData.filter(booking => new Date(booking.endTime) >= now);
//         setActiveBookingsCount(active.length);

//         // Then fetch based on activeView for display
//         if (activeView === 'active') {
//           url = `${API_BASE_URL}/active`;
//         } else if (activeView === 'expired') {
//           url = `${API_BASE_URL}/expired`;
//         }

//         const response = await fetch(url);
//         if (!response.ok) {
//           throw new Error(`HTTP error! status: ${response.status}`);
//         }
//         const data = await response.json();
//         setBookings(data);
//       } catch (error) {
//         console.error('Error fetching bookings:', error);
//         setMessage(`Error fetching bookings: ${error.message}`);
//       }
//     };

//     fetchBookings();
//   }, [activeView]); // Re-run when activeView changes

//   // Function to check for time overlaps
//   const isTimeOverlap = (start1, end1, start2, end2) => {
//     const s1 = new Date(start1);
//     const e1 = new Date(end1);
//     const s2 = new Date(start2);
//     const e2 = new Date(end2);
//     return s1 < e2 && s2 < e1;
//   };

//   // Logic to determine available courts
//   const availableCourts = () => {
//     if (!startTime || !endTime) {
//       return [];
//     }
//     const courts = Array.from({ length: TOTAL_COURTS_COUNT }, (_, i) => `Court ${i + 1}`);

//     // Filter out courts that have an overlapping active booking
//     const occupiedCourts = bookings
//       .filter(booking => new Date(booking.endTime) > new Date()) // only consider active bookings
//       .filter(booking => isTimeOverlap(startTime, endTime, booking.startTime, booking.endTime))
//       .map(booking => booking.courtNumber);

//     return courts.filter(court => !occupiedCourts.includes(court));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!courtNumber || !startTime || !endTime || !bookedBy) {
//       setMessage('Please fill in all fields.');
//       return;
//     }

//     // Check for availability before submission
//     if (!availableCourts().includes(courtNumber)) {
//       setMessage(`Error: Court ${courtNumber} is not available at the selected time.`);
//       return;
//     }

//     const newBooking = {
//       courtNumber,
//       startTime,
//       endTime,
//       bookedBy,
//     };

//     try {
//       const response = await fetch(API_BASE_URL, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'accept': '*'
//         },
//         body: JSON.stringify(newBooking),
//       });

//       const data = await response.json();

//       if (response.ok) {
//         setMessage(data.message);
//         setCourtNumber('');
//         setStartTime('');
//         setEndTime('');
//         setBookedBy('');
//         // After successful booking, refresh the 'all' view to show the new booking
//         // and re-calculate active bookings count
//         setActiveView('all');
//       } else {
//         setMessage(`Error: ${data.message || 'Failed to book court.'}`);
//       }
//     } catch (error) {
//       console.error('Error booking court:', error);
//       setMessage(`Server error: ${error.message}`);
//     }
//   };

//   const handleDelete = async (id) => {
//     if (!window.confirm('Are you sure you want to delete this booking?')) {
//       return;
//     }

//     try {
//       const response = await fetch(`${API_BASE_URL}/${id}`, {
//         method: 'DELETE',
//       });

//       const data = await response.json();

//       if (response.ok) {
//         setMessage(data.message);
//         setBookings(bookings.filter(booking => booking._id !== id));
//         setActiveView(activeView);
//       } else {
//         setMessage(`Error: ${data.message || 'Failed to delete booking.'}`);
//       }
//     } catch (error) {
//       console.error('Error deleting booking:', error);
//       setMessage(`Server error: ${error.message}`);
//     }
//   };

//   const formatDateTime = (isoString) => {
//     const date = new Date(isoString);
//     return date.toLocaleString();
//   };

//   const isTimeSelected = startTime && endTime;

//   return (
//     <Box sx={{
//       minHeight: '100vh',
//       bgcolor: '#f5f5f5',
//       py: 6
//     }}>
//       <Container maxWidth="lg">
//         <Paper elevation={3} sx={{
//           p: { xs: 2, md: 4 },
//           borderRadius: 4,
//           boxShadow: 24,
//         }}>
//           <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 4 }}>
//             Badminton Court Booking
//           </Typography>

//           {message && (
//             <Alert
//               severity={message.includes('Error') ? 'error' : 'success'}
//               sx={{ mb: 4 }}
//             >
//               {message}
//             </Alert>
//           )}

//           {/* Court Availability Section */}
//           <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 4, bgcolor: '#e3f2fd', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
//             <Box sx={{ display: 'flex', alignItems: 'center' }}>
//               <SportsTennisIcon color="primary" sx={{ mr: 1, fontSize: 30 }} />
//               <Typography variant="h6" color="primary.dark">
//                 Courts Overview:
//               </Typography>
//             </Box>
//             <Box sx={{ textAlign: 'right' }}>
//               <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
//                 Total Courts: {TOTAL_COURTS_COUNT}
//               </Typography>
//               <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'success.main' }}>
//                 Active Bookings: {activeBookingsCount}
//               </Typography>
//               <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'info.main' }}>
//                 Available for New Booking: {Math.max(0, TOTAL_COURTS_COUNT - activeBookingsCount)}
//               </Typography>
//             </Box>
//           </Paper>

//           <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mb: 4 }}>
//             Expired bookings automatically become available for new reservations.
//           </Alert>

//           {/* Booking Form Section */}
//           <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 }, mb: 4, bgcolor: '#f3f6f9', borderRadius: 2 }}>
//             <Typography variant="h5" component="h2" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
//               <AddCircleOutlineIcon sx={{ mr: 1 }} /> Book a New Court
//             </Typography>
//             <Box component="form" onSubmit={handleSubmit}>
//               <Grid container spacing={3}>
//                 <Grid item xs={12} sm={6}>
//                   <TextField
//                     fullWidth
//                     label="Booked By"
//                     variant="outlined"
//                     value={bookedBy}
//                     onChange={(e) => setBookedBy(e.target.value)}
//                     placeholder="Your Name"
//                     required
//                   />
//                 </Grid>
//                 <Grid item xs={12} sm={6}>
//                   <TextField
//                     fullWidth
//                     label="Start Time"
//                     type="datetime-local"
//                     InputLabelProps={{ shrink: true }}
//                     variant="outlined"
//                     value={startTime}
//                     onChange={(e) => setStartTime(e.target.value)}
//                     required
//                   />
//                 </Grid>
//                 <Grid item xs={12} sm={6}>
//                   <TextField
//                     fullWidth
//                     label="End Time"
//                     type="datetime-local"
//                     InputLabelProps={{ shrink: true }}
//                     variant="outlined"
//                     value={endTime}
//                     onChange={(e) => setEndTime(e.target.value)}
//                     required
//                   />
//                 </Grid>
//                 <Grid item xs={12} sm={6} style={{minWidth: '125px'}}>
//                   <FormControl fullWidth disabled={!isTimeSelected}>
//                     <InputLabel id="court-number-label">Court Number</InputLabel>
//                     <Select
//                       labelId="court-number-label"
//                       id="courtNumber"
//                       value={courtNumber}
//                       label="Court Number"
//                       onChange={(e) => setCourtNumber(e.target.value)}
//                       required
//                     >
//                       {availableCourts().length === 0 && (
//                         <MenuItem disabled>No courts available for this time.</MenuItem>
//                       )}
//                       {availableCourts().map((court) => (
//                         <MenuItem key={court} value={court}>
//                           {court}
//                         </MenuItem>
//                       ))}
//                     </Select>
//                   </FormControl>
//                 </Grid>
//                 <Grid item xs={12}>
//                   <Button
//                     fullWidth
//                     type="submit"
//                     variant="contained"
//                     color="primary"
//                     size="large"
//                     sx={{ mt: 2 }}
//                   >
//                     Book Court
//                   </Button>
//                 </Grid>
//               </Grid>
//             </Box>
//           </Paper>

//           {/* Bookings List Section */}
//           <Box>
//             <Typography variant="h5" component="h2" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
//               <ListIcon sx={{ mr: 1 }} /> All Bookings
//             </Typography>

//             <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
//               <ButtonGroup variant="contained" aria-label="outlined primary button group">
//                 <Button
//                   onClick={() => setActiveView('all')}
//                   color={activeView === 'all' ? 'primary' : 'inherit'}
//                 >
//                   All
//                 </Button>
//                 <Button
//                   onClick={() => setActiveView('active')}
//                   color={activeView === 'active' ? 'success' : 'inherit'}
//                 >
//                   Active
//                 </Button>
//                 <Button
//                   onClick={() => setActiveView('expired')}
//                   color={activeView === 'expired' ? 'error' : 'inherit'}
//                 >
//                   Expired
//                 </Button>
//               </ButtonGroup>
//             </Box>

//             {bookings.length === 0 ? (
//               <Typography variant="body1" align="center" color="text.secondary" sx={{ mt: 4 }}>
//                 No bookings found for this view.
//               </Typography>
//             ) : (
//               <Grid container spacing={3}>
//                 {bookings.map((booking) => (
//                   <Grid item xs={12} sm={6} md={4} key={booking._id}>
//                     <Card variant="outlined" sx={{
//                       height: '100%',
//                       display: 'flex',
//                       flexDirection: 'column',
//                       justifyContent: 'space-between'
//                     }}>
//                       <CardContent>
//                         <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
//                           {booking.courtNumber}
//                         </Typography>
//                         <Box sx={{ mt: 2 }}>
//                           <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
//                             <Icon component={CalendarMonthIcon} sx={{ mr: 1, color: 'text.secondary' }} />
//                             <Typography variant="body2" color="text.secondary">
//                               <Box component="span" sx={{ fontWeight: 'bold' }}>Start:</Box> {formatDateTime(booking.startTime)}
//                             </Typography>
//                           </Box>
//                           <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
//                             <Icon component={AccessTimeIcon} sx={{ mr: 1, color: 'text.secondary' }} />
//                             <Typography variant="body2" color="text.secondary">
//                               <Box component="span" sx={{ fontWeight: 'bold' }}>End:</Box> {formatDateTime(booking.endTime)}
//                             </Typography>
//                           </Box>
//                           <Box sx={{ display: 'flex', alignItems: 'center' }}>
//                             <Icon component={PersonIcon} sx={{ mr: 1, color: 'text.secondary' }} />
//                             <Typography variant="body2" color="text.secondary">
//                               <Box component="span" sx={{ fontWeight: 'bold' }}>Booked By:</Box> {booking.bookedBy}
//                             </Typography>
//                           </Box>
//                         </Box>
//                       </CardContent>
//                       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pt: 0 }}>
//                         {new Date(booking.endTime) < new Date() ? (
//                           <Chip label="Expired" icon={<CancelIcon />} color="error" />
//                         ) : (
//                           <Chip label="Active" icon={<CheckCircleIcon />} color="success" />
//                         )}
//                         <IconButton
//                           aria-label="delete"
//                           onClick={() => handleDelete(booking._id)}
//                           color="error"
//                         >
//                           <DeleteIcon />
//                         </IconButton>
//                       </Box>
//                     </Card>
//                   </Grid>
//                 ))}
//               </Grid>
//             )}
//           </Box>
//         </Paper>
//       </Container>
//     </Box>
//   );
// }

// export default App;